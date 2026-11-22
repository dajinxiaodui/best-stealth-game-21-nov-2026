// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on
// the screen size. "The Quiet Gallery": a top-down stealth game. You are Wren, a
// thief in a closed museum after dark. Slip past the patrolling guards, pocket
// every glowing artefact, and reach the green exit unseen.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 205,
  sneakSpeed: 115,
  /** Running is loud: guards inside this radius hear your footsteps. */
  noiseRadius: 95,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 78,
  chaseSpeed: 175,
  investigateSpeed: 120,
  /** How far a guard can see, in pixels. */
  viewRange: 235,
  /** Half of the vision cone's angle, in radians. */
  viewHalfAngle: 0.62,
  /** Detection fills this fast (per second) when the player is seen up close. */
  detectNear: 1.5,
  /** ...and this fast at the far edge of the cone. */
  detectFar: 0.65,
  /** Sneaking shrinks the range at which a guard can spot you. */
  sneakViewRange: 150,
  /** Detection drains this fast per second once you break line of sight. */
  detectDecay: 0.45,
  /** Seconds a chasing guard keeps hunting after losing sight of you. */
  huntMemory: 4,
  /** Seconds a guard looks around at an investigated spot before resuming patrol. */
  lookAround: 2.2,
};

export const COIN = {
  /** Coins (noisemakers) per level. Click to toss one where the mouse points. */
  perLevel: 3,
  /** How far a tossed coin can fly from the player. */
  throwRange: 330,
  /** Guards inside this radius of the landing spot come to look. */
  noiseRadius: 150,
};

export const SCORING = {
  artefact: 250,
  ghostBonus: 500,
  /** Time bonus on clearing a level: this minus 2 per second spent, floored at 0. */
  timeBase: 300,
  timePerSecond: 2,
};

export const LIVES = 3;

export const PALETTE = {
  backdrop: '#0b0d12',
  floorA: '#1a1d27',
  floorB: '#171a23',
  wall: '#3a4157',
  wallTop: '#4b5470',
  cover: '#2c3350',
  coverTop: '#3d476b',
  caseGlass: '#31435c',
  player: '#e8d27a',
  playerSneak: '#b7a45c',
  guard: '#e5534b',
  guardCalm: '#d97b4f',
  cone: 'rgba(242, 201, 76, 0.16)',
  coneAlert: 'rgba(229, 83, 75, 0.28)',
  artefact: '#7fe3c0',
  exit: '#58d68d',
  exitLocked: '#3d6b52',
  text: '#eef1f5',
  muted: '#9aa1b5',
  danger: '#e5534b',
  panel: 'rgba(12, 14, 20, 0.88)',
  gold: '#f2c94c',
};

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'quiet-gallery.best';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
