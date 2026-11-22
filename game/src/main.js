// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, paused,
// wing cleared, caught, and the final win.
//
// ?seed=N fixes the run. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.

import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_ALARM,
  EVENT_ARTEFACT,
  EVENT_CAUGHT,
  EVENT_LEVEL_CLEAR,
  EVENT_SPOTTED,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_THROW, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_CLEAR,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let notice = null;
  let stepCount = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    notice = null;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Pocket every artefact, then reach the exit.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Caught. Score ${world.state.score}. Best ${best}.`);
  }

  function winGame() {
    screen = SCREEN_WIN;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`You cleared the gallery. Final score ${world.state.score}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_ARTEFACT) {
      audio.artefact();
      announce(`${world.state.artefactsGot} of ${world.state.artefacts.length} artefacts.`);
    }
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & EVENT_ALARM) {
      audio.alarm();
      announce('A guard raised the alarm! Break line of sight.');
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      if (world.state.over) endGame();
      else announce(`Caught! ${world.state.lives} ${world.state.lives === 1 ? 'life' : 'lives'} left. The wing resets.`);
    }
    if (events & EVENT_LEVEL_CLEAR) {
      audio.levelClear();
      if (world.state.won) {
        winGame();
      } else {
        const cleared = world.state.levelIndex; // loadLevel already advanced it
        notice = {
          title: 'WING CLEARED',
          lines: [
            `You slipped out of wing ${cleared} unseen enough.`,
            `Score ${world.state.score}   ·   Best ${best}`,
            world.state.lastGhost ? 'Ghost bonus banked: no guard ever raised the alarm.' : 'The guards saw you this time — ghost bonus lost.',
          ],
        };
        screen = SCREEN_CLEAR;
        announce('Wing cleared. Press Space for the next wing.');
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_THROW) {
      const click = input.takeClick();
      if (click && screen === SCREEN_PLAY && world.throwCoin(click.x, click.y)) {
        audio.coin();
      }
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_CLEAR) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // Attract mode: the guards patrol behind the title panel.
      world.step(STEP, { x: 0, y: 0, sneak: false }, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP, input.direction(), false);
    stepCount += 1;
    // A soft footstep tick while moving, slower when sneaking.
    if (world.state.player.moving && stepCount % (world.state.player.sneaking ? 26 : 16) === 0) {
      audio.footstep(world.state.player.sneaking);
    }
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      step();
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world.state, screen, best, notice);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Quiet Gallery. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
