// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The
// night moves between four screens: title, play, paused and the ending (getaway or caught).
//
// ?seed=N fixes the night's randomness. ?shot=start|play|alarm|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_TRIPPED, EVENT_WON, PHASE_CAUGHT, PHASE_WON } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
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

/** Turn a mouse point in the window into the field point it shows, at any window size. */
function toField(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * FIELD.width,
    y: ((clientY - rect.top) / rect.height) * FIELD.height,
  };
}

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
    // Storage can be off (private windows): the best haul then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, toField);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear how the night turns.
  function announce(message) {
    status.textContent = message;
  }

  function startNight() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Inside. Lift the Sun Disk, then reach the service door.');
  }

  function endNight() {
    screen = SCREEN_OVER;
    if (world.phase === PHASE_WON) {
      if (world.lootValue > best) {
        best = world.lootValue;
        saveBest(best);
      }
      announce(`Clean getaway. Loot $${world.lootValue.toLocaleString('en-US')}.`);
    } else {
      announce(`Caught. The night ends with $${world.lootValue.toLocaleString('en-US')} in the bag.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) startNight();
    else if (screen === SCREEN_OVER && (actions & (ACTION_CONFIRM | ACTION_RESTART))) startNight();
    else if (screen === SCREEN_PLAY && (actions & ACTION_RESTART)) startNight();
    else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      // Behind the title the gallery stays alive: the guards walk their rounds while the
      // thief waits at the door. A night only begins on the player's word.
      const playing = screen === SCREEN_PLAY;
      const direction = playing ? input.direction() : { x: 0, y: 0 };
      while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
        const events = world.step(STEP, {
          x: direction.x,
          y: direction.y,
          sneak: playing ? input.sneaking() : false,
          tosses: playing ? input.takeTosses() : [],
        });
        accumulator -= STEP;
        if (playing && (events & EVENT_TRIPPED)) announce('The alarm has tripped. Run.');
        if (playing && (events & (EVENT_CAUGHT | EVENT_WON))) endNight();
      }
    } else {
      accumulator = 0;
      input.takeTosses();
    }
    renderer.draw(world, screen, best);
  }

  // Leaving the tab pauses a running night rather than letting it play out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Night Vault. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
