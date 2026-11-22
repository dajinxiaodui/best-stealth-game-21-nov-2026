// The simulation: no DOM here, so Node can import and exercise it directly.
// The player sneaks through a museum wing; guards patrol, watch, and chase.
// The world advances in fixed steps and reports events the main loop turns into
// sound, announcements and screen changes.

import { COIN, FIELD, GUARD, PLAYER, SCORING, STEP } from './config.js';
import { createLevel, solidRects } from './levels.js';

export const EVENT_CAUGHT = 1;
export const EVENT_ARTEFACT = 2;
export const EVENT_LEVEL_CLEAR = 4;
export const EVENT_ALARM = 8;
export const EVENT_SPOTTED = 16;

/** True when the point lies inside the rectangle (edges inclusive). */
export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when the straight line from (x1,y1) to (x2,y2) is blocked by any rect. */
export function lineBlocked(x1, y1, x2, y2, rects) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    for (const r of rects) {
      if (pointInRect(x, y, r)) return true;
    }
  }
  return false;
}

/** Push a circle out of every rectangle it overlaps; returns true on a hit. */
function collideCircle(pos, radius, rects) {
  let hit = false;
  for (const r of rects) {
    const cx = Math.max(r.x, Math.min(pos.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(pos.y, r.y + r.h));
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.y = cy + (dy / d) * radius;
      } else {
        // Dead centre inside the rect: shove out along the shallowest side.
        const left = pos.x - r.x;
        const right = r.x + r.w - pos.x;
        const top = pos.y - r.y;
        const bottom = r.y + r.h - pos.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) pos.x = r.x - radius;
        else if (m === right) pos.x = r.x + r.w + radius;
        else if (m === top) pos.y = r.y - radius;
        else pos.y = r.y + r.h + radius;
      }
    }
  }
  return hit;
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function makeGuard(def) {
  const [sx, sy] = def.waypoints[0];
  const [tx, ty] = def.waypoints[1] ?? def.waypoints[0];
  return {
    x: sx,
    y: sy,
    facing: angleTo(sx, sy, tx, ty),
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    pause: def.pause ?? 1,
    pauseLeft: 0,
    state: 'patrol', // patrol | investigate | chase | look
    detection: 0,
    huntLeft: 0,
    lookLeft: 0,
    targetX: sx,
    targetY: sy,
    alerted: false,
  };
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: null,
    rects: [],
    player: { x: 0, y: 0, facing: 0, moving: false, sneaking: false, noise: 0 },
    guards: [],
    artefacts: [],
    artefactsGot: 0,
    coins: COIN.perLevel,
    coinPings: [],
    lives: 3,
    score: 0,
    time: 0,
    levelTime: 0,
    ghost: true,
    lastGhost: true,
    exitOpen: false,
    caughtFlash: 0,
    alarm: false,
    over: false,
    won: false,
  };

  function loadLevel(index) {
    state.levelIndex = index;
    state.level = createLevel(index);
    state.rects = solidRects(state.level);
    state.player.x = state.level.playerStart[0];
    state.player.y = state.level.playerStart[1];
    state.player.facing = 0;
    state.guards = state.level.guards.map(makeGuard);
    state.artefacts = state.level.artefacts.map(([x, y]) => ({ x, y, taken: false }));
    state.artefactsGot = 0;
    state.coins = COIN.perLevel;
    state.coinPings = [];
    state.levelTime = 0;
    state.ghost = true;
    state.exitOpen = false;
    state.alarm = false;
  }

  function reset() {
    state.lives = 3;
    state.score = 0;
    state.time = 0;
    state.over = false;
    state.won = false;
    loadLevel(0);
  }

  loadLevel(0);

  function guardSeesPlayer(guard) {
    const dx = state.player.x - guard.x;
    const dy = state.player.y - guard.y;
    const dist = Math.hypot(dx, dy);
    const range = state.player.sneaking ? GUARD.sneakViewRange : GUARD.viewRange;
    if (dist > range) return 0;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, guard.facing)) > GUARD.viewHalfAngle) return 0;
    if (lineBlocked(guard.x, guard.y, state.player.x, state.player.y, state.rects)) return 0;
    // Closer reads are clearer: 1 at point blank, ~0.4 at the cone's edge.
    return 1 - 0.6 * (dist / range);
  }

  function moveGuard(guard, tx, ty, speed, dt) {
    const dx = tx - guard.x;
    const dy = ty - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const want = Math.atan2(dy, dx);
    let turn = angleDiff(want, guard.facing);
    const maxTurn = 5.5 * dt;
    guard.facing += Math.max(-maxTurn, Math.min(maxTurn, turn));
    const step = Math.min(dist, speed * dt);
    guard.x += Math.cos(guard.facing) * step;
    guard.y += Math.sin(guard.facing) * step;
    collideCircle(guard, GUARD.radius, state.rects);
    return dist - step < 2;
  }

  function step(dt, input, attract) {
    if (state.over || state.won) return 0;
    let events = 0;
    state.time += dt;
    state.levelTime += dt;
    if (state.caughtFlash > 0) state.caughtFlash -= dt;

    // --- Player movement ---
    const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const mx = input.x;
    const my = input.y;
    const moving = mx !== 0 || my !== 0;
    state.player.moving = moving;
    state.player.sneaking = input.sneak; // Holding Shift crouches you, still or moving.
    if (moving) {
      const len = Math.hypot(mx, my);
      state.player.facing = Math.atan2(my / len, mx / len);
      state.player.x += (mx / len) * speed * dt;
      state.player.y += (my / len) * speed * dt;
      collideCircle(state.player, PLAYER.radius, state.rects);
      state.player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, state.player.x));
      state.player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, state.player.y));
    }
    // Running is loud: nearby guards come to look.
    state.player.noise = moving && !input.sneak ? PLAYER.noiseRadius : 0;

    // --- Thrown coins: a ping guards can hear ---
    for (const ping of state.coinPings) ping.life -= dt;
    state.coinPings = state.coinPings.filter((p) => p.life > 0);

    // --- Artefacts ---
    for (const a of state.artefacts) {
      if (!a.taken && Math.hypot(a.x - state.player.x, a.y - state.player.y) < PLAYER.radius + 20) {
        a.taken = true;
        state.artefactsGot += 1;
        state.score += SCORING.artefact;
        events |= EVENT_ARTEFACT;
        if (state.artefactsGot === state.artefacts.length) state.exitOpen = true;
      }
    }

    // --- Exit ---
    if (state.exitOpen) {
      const [ex, ey] = state.level.exit;
      if (Math.hypot(ex - state.player.x, ey - state.player.y) < 34) {
        state.score += Math.max(0, SCORING.timeBase - Math.floor(state.levelTime) * SCORING.timePerSecond);
        if (state.ghost) state.score += SCORING.ghostBonus;
        state.lastGhost = state.ghost; // loadLevel resets ghost; keep the cleared wing's.
        events |= EVENT_LEVEL_CLEAR;
        if (state.levelIndex + 1 >= 3) {
          state.won = true;
        } else {
          loadLevel(state.levelIndex + 1);
        }
        return events;
      }
    }

    // --- Guards ---
    let anyAlarm = false;
    for (const guard of state.guards) {
      const seen = guardSeesPlayer(guard);
      const wasAlerted = guard.alerted;

      if (seen > 0) {
        const rate = GUARD.detectFar + (GUARD.detectNear - GUARD.detectFar) * seen;
        guard.detection = Math.min(1, guard.detection + rate * dt);
        if (guard.detection >= 1 && !guard.alerted) {
          guard.alerted = true;
          guard.state = 'chase';
          guard.huntLeft = GUARD.huntMemory;
          state.ghost = false;
          events |= EVENT_ALARM;
        }
      } else {
        guard.detection = Math.max(0, guard.detection - GUARD.detectDecay * dt);
      }
      if (guard.detection > 0.35 && !wasAlerted && guard.state === 'patrol') events |= EVENT_SPOTTED;

      // Hearing: running footsteps or a tossed coin.
      if (guard.state === 'patrol' || guard.state === 'look') {
        if (state.player.noise > 0) {
          const d = Math.hypot(state.player.x - guard.x, state.player.y - guard.y);
          if (d < state.player.noise + 30) {
            guard.state = 'investigate';
            guard.targetX = state.player.x;
            guard.targetY = state.player.y;
          }
        }
        for (const ping of state.coinPings) {
          const d = Math.hypot(ping.x - guard.x, ping.y - guard.y);
          if (d < COIN.noiseRadius) {
            guard.state = 'investigate';
            guard.targetX = ping.x;
            guard.targetY = ping.y;
          }
        }
      }

      if (guard.state === 'patrol') {
        if (guard.pauseLeft > 0) {
          guard.pauseLeft -= dt;
        } else {
          const [tx, ty] = guard.waypoints[guard.waypointIndex];
          if (moveGuard(guard, tx, ty, GUARD.patrolSpeed, dt)) {
            guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
            guard.pauseLeft = guard.pause;
          }
        }
      } else if (guard.state === 'investigate') {
        if (moveGuard(guard, guard.targetX, guard.targetY, GUARD.investigateSpeed, dt)) {
          guard.state = 'look';
          guard.lookLeft = GUARD.lookAround;
        }
      } else if (guard.state === 'look') {
        guard.lookLeft -= dt;
        guard.facing += dt * 1.6; // Scan the room before giving up.
        if (guard.lookLeft <= 0) guard.state = 'patrol';
      } else if (guard.state === 'chase') {
        const sees = guardSeesPlayer(guard) > 0;
        if (sees) {
          guard.huntLeft = GUARD.huntMemory;
          moveGuard(guard, state.player.x, state.player.y, GUARD.chaseSpeed, dt);
        } else {
          guard.huntLeft -= dt;
          moveGuard(guard, state.player.x, state.player.y, GUARD.chaseSpeed * 0.8, dt);
          if (guard.huntLeft <= 0) {
            guard.alerted = false;
            guard.state = 'patrol';
          }
        }
        // Caught.
        if (Math.hypot(state.player.x - guard.x, state.player.y - guard.y) < PLAYER.radius + GUARD.radius - 4) {
          events |= EVENT_CAUGHT;
          state.lives -= 1;
          state.caughtFlash = 0.9;
          if (state.lives <= 0) {
            state.over = true;
          } else {
            loadLevel(state.levelIndex);
          }
          return events;
        }
      }
      if (guard.alerted) anyAlarm = true;
    }
    state.alarm = anyAlarm;

    // Attract mode (title screen): guards patrol, nobody is caught.
    void attract;
    return events;
  }

  /** Toss a noisemaker toward a point (mouse click). Returns false if none left. */
  function throwCoin(x, y) {
    if (state.coins <= 0 || state.over || state.won) return false;
    const dx = x - state.player.x;
    const dy = y - state.player.y;
    const dist = Math.hypot(dx, dy);
    const range = Math.min(dist, COIN.throwRange);
    const tx = dist > 0 ? state.player.x + (dx / dist) * range : state.player.x;
    const ty = dist > 0 ? state.player.y + (dy / dist) * range : state.player.y;
    state.coins -= 1;
    state.coinPings.push({ x: tx, y: ty, life: 1.4 });
    return true;
  }

  return { state, step, reset, throwCoin, loadLevel };
}
