// Keyboard and mouse input. Held keys give a movement direction and the sneak key; one-shot
// presses (start or restart, pause) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. Mouse clicks are queued as
// coin tosses at the clicked point of the field.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);

/**
 * Create the input reader bound to a canvas. `toField` turns a mouse event's client point into
 * field coordinates, so a click means the same point of the gallery at any window size.
 */
export function createInput(canvas, toField) {
  const held = new Set();
  let actions = 0;
  const tosses = [];

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (!SNEAK.has(event.code) && !event.code.startsWith('Arrow') && !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.clear();
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toField(event.clientX, event.clientY);
    if (point) tosses.push(point);
    actions |= ACTION_CONFIRM;
  });

  return {
    /** The held movement direction as a unit vector (diagonals are not faster). */
    direction() {
      let x = 0;
      let y = 0;
      if (held.has('ArrowLeft') || held.has('KeyA')) x -= 1;
      if (held.has('ArrowRight') || held.has('KeyD')) x += 1;
      if (held.has('ArrowUp') || held.has('KeyW')) y -= 1;
      if (held.has('ArrowDown') || held.has('KeyS')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    /** True while Shift is held: the thief creeps, slower and harder to spot. */
    sneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The field points clicked since the last call, oldest first. */
    takeTosses() {
      return tosses.splice(0, tosses.length);
    },
  };
}
