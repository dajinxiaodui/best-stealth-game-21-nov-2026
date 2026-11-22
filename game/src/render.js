// Canvas painting: the museum floor, walls and display cases, guards with
// ray-cast vision cones that stop at walls, the thief, artefacts, the exit, and
// every screen (title, pause, wing cleared, caught, and the final win). The
// playfield is a fixed 1280x720 logical area scaled to the canvas, and a soft
// darkness falls away from the player so lit floor reads as safe ground.

import { FIELD, FONT, GUARD, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
export const SCREEN_CLEAR = 'clear';

const CONE_RAYS = 26;

function conePolygon(guard, rects, range) {
  const points = [[guard.x, guard.y]];
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = guard.facing - GUARD.viewHalfAngle + (2 * GUARD.viewHalfAngle * i) / CONE_RAYS;
    let r = range;
    // March out in short steps; the cone stops at the first wall it meets.
    for (let d = 8; d <= range; d += 8) {
      const x = guard.x + Math.cos(a) * d;
      const y = guard.y + Math.sin(a) * d;
      let blocked = false;
      for (const rect of rects) {
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        r = d;
        break;
      }
    }
    points.push([guard.x + Math.cos(a) * r, guard.y + Math.sin(a) * r]);
  }
  return points;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }

  function fit() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
  }

  function drawFloor() {
    ctx.fillStyle = PALETTE.floorA;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.floorB;
    for (let y = 0; y < FIELD.height; y += 80) {
      for (let x = 0; x < FIELD.width; x += 80) {
        if (((x + y) / 80) % 2 === 0) ctx.fillRect(x, y, 80, 80);
      }
    }
    // Faint carpet runner down the middle of each wing.
    ctx.fillStyle = 'rgba(90, 40, 60, 0.25)';
    ctx.fillRect(0, 330, FIELD.width, 60);
  }

  function drawRect(r, fill, top) {
    ctx.fillStyle = fill;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = top;
    ctx.fillRect(r.x, r.y, r.w, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);
  }

  function drawCone(guard, rects) {
    const range = guard.state === 'chase' ? GUARD.viewRange : GUARD.viewRange;
    const poly = conePolygon(guard, rects, range);
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.fillStyle = guard.alerted ? PALETTE.coneAlert : PALETTE.cone;
    ctx.fill();
  }

  function drawGuard(guard) {
    const alerted = guard.alerted;
    // Body.
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fillStyle = alerted ? PALETTE.guard : PALETTE.guardCalm;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick and torch dot.
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * (GUARD.radius + 8), guard.y + Math.sin(guard.facing) * (GUARD.radius + 8));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Suspicion: a filling arc, then "?" when close, "!" when chasing.
    if (guard.detection > 0.03 || alerted) {
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.detection);
      ctx.strokeStyle = alerted ? PALETTE.danger : PALETTE.gold;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (alerted) {
      ctx.fillStyle = PALETTE.danger;
      ctx.fillText('!', guard.x, guard.y - GUARD.radius - 18);
    } else if (guard.detection > 0.35) {
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText('?', guard.x, guard.y - GUARD.radius - 18);
    }
  }

  function drawPlayer(player) {
    // Soft shadow of attention: a faint ring shows the noise you make running.
    if (player.noise > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.noise, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(238, 210, 122, 0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood point shows facing.
    ctx.beginPath();
    ctx.moveTo(player.x + Math.cos(player.facing) * PLAYER.radius, player.y + Math.sin(player.facing) * PLAYER.radius);
    ctx.lineTo(
      player.x + Math.cos(player.facing + 2.5) * (PLAYER.radius - 4),
      player.y + Math.sin(player.facing + 2.5) * (PLAYER.radius - 4),
    );
    ctx.lineTo(
      player.x + Math.cos(player.facing - 2.5) * (PLAYER.radius - 4),
      player.y + Math.sin(player.facing - 2.5) * (PLAYER.radius - 4),
    );
    ctx.closePath();
    ctx.fillStyle = '#3a2f14';
    ctx.fill();
  }

  function drawArtefact(a, time) {
    if (a.taken) return;
    const pulse = 0.6 + 0.4 * Math.sin(time * 3 + a.x);
    const r = 12 + 3 * pulse;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = 0.35 * pulse;
    ctx.fillStyle = PALETTE.artefact;
    ctx.fillRect(-r - 8, -r - 8, (r + 8) * 2, (r + 8) * 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.artefact;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = '#eafff5';
    ctx.lineWidth = 2;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  function drawExit(state) {
    const [ex, ey] = state.level.exit;
    const open = state.exitOpen;
    const pulse = open ? 0.7 + 0.3 * Math.sin(state.time * 4) : 1;
    ctx.globalAlpha = open ? pulse : 0.85;
    ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    ctx.beginPath();
    ctx.arc(ex, ey, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#062b16';
    ctx.fillText(open ? 'EXIT' : 'LOCKED', ex, ey);
    if (!open) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `12px ${FONT}`;
      ctx.fillText(`${state.artefactsGot}/${state.artefacts.length} artefacts`, ex, ey + 46);
    }
  }

  function drawHud(state, best) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = canvas.width;
    const scale = w / FIELD.width;
    ctx.fillStyle = 'rgba(8, 10, 15, 0.72)';
    ctx.fillRect(0, 0, w, 44 * scale);
    ctx.font = `bold ${15 * scale}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    const level = state.level;
    ctx.fillText(`${level.name}  ·  Wing ${state.levelIndex + 1}/3`, 14 * scale, 22 * scale);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.artefact;
    ctx.fillText(`◆ ${state.artefactsGot}/${state.artefacts.length}`, w * 0.42, 22 * scale);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`◉ ${state.coins} coins`, w * 0.55, 22 * scale);
    ctx.fillStyle = PALETTE.danger;
    ctx.fillText('♥'.repeat(Math.max(0, state.lives)), w * 0.68, 22 * scale);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Score ${state.score}   Best ${best}`, w - 14 * scale, 22 * scale);
    ctx.restore();
    fit();
    // Alarm banner.
    if (state.alarm) {
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.danger;
      ctx.fillText('— ALARM —  break line of sight!', FIELD.width / 2, 70);
    }
  }

  function panel(title, lines, hint) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(240, 150, 800, 420);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(240, 150, 800, 420);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, 225);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `19px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 285 + i * 32));
    if (hint) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `17px ${FONT}`;
      ctx.fillText(hint, FIELD.width / 2, 285 + lines.length * 32 + 30);
    }
  }

  function drawWorld(state) {
    drawFloor();
    for (const w of state.level.walls) drawRect(w, PALETTE.wall, PALETTE.wallTop);
    for (const c of state.level.cover) drawRect(c, PALETTE.cover, PALETTE.caseGlass);
    for (const guard of state.guards) drawCone(guard, state.rects);
    drawExit(state);
    for (const a of state.artefacts) drawArtefact(a, state.time);
    for (const ping of state.coinPings) {
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, 26 * (ping.life / 1.4), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(242, 201, 76, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const guard of state.guards) drawGuard(guard);
    drawPlayer(state.player);
    // Darkness gathers away from the thief: lit floor reads as safe ground.
    const g = ctx.createRadialGradient(
      state.player.x, state.player.y, 110,
      state.player.x, state.player.y, 620,
    );
    g.addColorStop(0, 'rgba(4, 5, 9, 0)');
    g.addColorStop(1, 'rgba(4, 5, 9, 0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (state.caughtFlash > 0) {
      ctx.fillStyle = `rgba(229, 83, 75, ${0.25 * state.caughtFlash})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function draw(state, screen, best, notice) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    fit();
    drawWorld(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_CLEAR) {
      drawHud(state, best);
    }
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(6, 8, 12, 0.72)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel('THE QUIET GALLERY', [
        'A top-down stealth game. You are Wren, a thief in a closed museum.',
        'Pocket every glowing artefact, then slip out through the green exit.',
        'Stay out of the guards’ yellow cones. Crouch (Shift) to move quietly',
        'and shrink the range they can spot you from. Running is loud.',
        'Click to toss a coin and lure a guard away. Three coins a wing.',
        'Get caught three times and the night is over.',
      ], 'WASD / arrows to move · Shift to sneak · Click to toss a coin · P to pause · Space to start');
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(6, 8, 12, 0.6)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel('PAUSED', ['The guards wait. The gallery holds its breath.'], 'Press P or Space to keep sneaking');
    } else if (screen === SCREEN_CLEAR && notice) {
      ctx.fillStyle = 'rgba(6, 8, 12, 0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel(notice.title, notice.lines, 'Press Space for the next wing');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(20, 4, 6, 0.78)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel('CAUGHT', [
        'The guards have you. The gallery keeps its secrets tonight.',
        `Score ${state.score}   ·   Best ${best}`,
      ], 'Press Space to try again');
    } else if (screen === SCREEN_WIN) {
      ctx.fillStyle = 'rgba(6, 12, 8, 0.72)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel('THE GALLERY IS YOURS', [
        'Every wing cleared, every artefact pocketed, never once in cuffs.',
        `Final score ${state.score}   ·   Best ${best}`,
      ], 'Press Space to play again');
    }
  }

  return { draw, resize };
}
