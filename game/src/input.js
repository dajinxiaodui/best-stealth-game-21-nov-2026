// Keyboard and mouse, read once per frame. WASD or arrows move, Shift sneaks,
// Space or Enter confirms, P or Escape pauses, and a mouse click tosses a
// noisemaker toward the cursor. Touch taps work the same as clicks.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_THROW = 4;

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
};

export function createInput(canvas, onThrow) {
  const held = new Set();
  let actions = 0;
  let click = null;

  function keyDown(event) {
    const name = KEYMAP[event.code];
    if (name) {
      held.add(name);
      event.preventDefault();
    } else if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
      event.preventDefault();
    }
  }

  function keyUp(event) {
    held.delete(KEYMAP[event.code]);
  }

  function pointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    click = {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
    actions |= ACTION_THROW;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);

  return {
    direction() {
      const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      return { x, y, sneak: held.has('sneak') };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
