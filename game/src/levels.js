// The three museum wings. Each level is plain data: walls and cover (both block
// movement and line of sight), guard patrol routes, artefacts to pocket, the exit,
// and where Wren slips in. Coordinates are in the 1280x720 logical field; the
// border walls are added by createLevel, so layouts only list interior pieces.
//
// Guard routes were drawn to stay clear of walls and cover: a guard walks the
// straight line between its waypoints, pauses at each end, then turns back.

const BORDER = 24;

function borderWalls() {
  const { width, height } = { width: 1280, height: 720 };
  return [
    { x: 0, y: 0, w: width, h: BORDER },
    { x: 0, y: height - BORDER, w: width, h: BORDER },
    { x: 0, y: 0, w: BORDER, h: height },
    { x: width - BORDER, y: 0, w: BORDER, h: height },
  ];
}

export const LEVELS = [
  {
    name: 'The Foyer',
    subtitle: 'Two guards, three artefacts. Learn the cones.',
    playerStart: [80, 640],
    exit: [1200, 640],
    walls: [
      { x: 420, y: 24, w: 24, h: 276 },
      { x: 700, y: 430, w: 556, h: 24 },
    ],
    cover: [
      { x: 560, y: 150, w: 90, h: 50 },
      { x: 850, y: 300, w: 90, h: 50 },
      { x: 200, y: 500, w: 90, h: 50 },
      { x: 950, y: 520, w: 110, h: 50 },
      { x: 620, y: 560, w: 80, h: 50 },
    ],
    guards: [
      { waypoints: [[300, 360], [1000, 360]], pause: 1.2 },
      { waypoints: [[330, 560], [330, 140]], pause: 1.0 },
    ],
    artefacts: [[1100, 120], [620, 360], [150, 120]],
  },
  {
    name: 'The Long Hall',
    subtitle: 'Three guards cross the hall. Mind the open floor.',
    playerStart: [80, 80],
    exit: [1200, 80],
    walls: [
      { x: 300, y: 24, w: 24, h: 396 },
      { x: 640, y: 300, w: 24, h: 396 },
      { x: 960, y: 24, w: 24, h: 396 },
    ],
    cover: [
      { x: 40, y: 300, w: 80, h: 50 },
      { x: 480, y: 120, w: 90, h: 50 },
      { x: 800, y: 560, w: 100, h: 50 },
      { x: 1080, y: 300, w: 100, h: 50 },
      { x: 480, y: 560, w: 90, h: 50 },
    ],
    guards: [
      { waypoints: [[150, 120], [150, 600]], pause: 1.0 },
      { waypoints: [[700, 260], [920, 260]], pause: 1.4 },
      { waypoints: [[1000, 120], [1150, 120]], pause: 1.0 },
    ],
    artefacts: [[150, 650], [1120, 650], [480, 300]],
  },
  {
    name: 'The Vault Wing',
    subtitle: 'Four guards, tight corners. No room for mistakes.',
    playerStart: [80, 640],
    exit: [1200, 640],
    walls: [
      { x: 420, y: 24, w: 24, h: 276 },
      { x: 700, y: 420, w: 556, h: 24 },
      { x: 900, y: 24, w: 24, h: 276 },
    ],
    cover: [
      { x: 60, y: 500, w: 100, h: 50 },
      { x: 600, y: 120, w: 90, h: 50 },
      { x: 1050, y: 450, w: 100, h: 50 },
      { x: 700, y: 520, w: 90, h: 50 },
      { x: 250, y: 220, w: 80, h: 50 },
    ],
    guards: [
      { waypoints: [[200, 100], [200, 600]], pause: 1.0 },
      { waypoints: [[650, 330], [1100, 330]], pause: 1.2 },
      { waypoints: [[1050, 300], [1050, 120]], pause: 1.0 },
      { waypoints: [[550, 600], [1000, 600]], pause: 1.4 },
    ],
    artefacts: [[1200, 120], [560, 80], [980, 480]],
  },
];

/** A level with its border walls merged in, ready for the world to simulate. */
export function createLevel(index) {
  const def = LEVELS[index % LEVELS.length];
  return {
    index,
    name: def.name,
    subtitle: def.subtitle,
    playerStart: def.playerStart,
    exit: def.exit,
    walls: [...borderWalls(), ...def.walls],
    cover: def.cover,
    guards: def.guards,
    artefacts: def.artefacts,
  };
}

/** Every rectangle that blocks movement and sight: walls plus cover. */
export function solidRects(level) {
  return [...level.walls, ...level.cover];
}
