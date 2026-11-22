// The screenshot scenes behind ?shot=start|play|alarm|end. Each one plays the real rules
// forward from a fresh world, the thief steered by a waypoint pilot walking a planned route
// through the gallery, so the frame is what a real run looks like and the same seed always
// gives the same frame: the start is the title over the waking gallery, play is the crossing,
// alarm is the Disk lifted and a camera burning red, end is the getaway tally.

import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { PHASE_WON } from './world.js';

const IDLE = { x: 0, y: 0, sneak: false, tosses: [] };

/**
 * A pilot that walks the thief through waypoints in order. It gives up on a waypoint it has
 * made no real progress toward for a second (wedged on a corner), so a scene never stalls.
 */
function createPilot(waypoints, sneak = false) {
  return { waypoints, sneak, index: 0, trail: [], done: false };
}

function pilotInput(world, pilot) {
  if (pilot.done) return IDLE;
  const thief = world.thief;
  const target = pilot.waypoints[pilot.index];
  const dx = target.x - thief.x;
  const dy = target.y - thief.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 14) {
    pilot.index += 1;
    pilot.trail = [];
    if (pilot.index >= pilot.waypoints.length) pilot.done = true;
    return pilot.done ? IDLE : pilotInput(world, pilot);
  }
  pilot.trail.push({ x: thief.x, y: thief.y });
  if (pilot.trail.length > 55) pilot.trail.shift();
  if (pilot.trail.length === 55) {
    const old = pilot.trail[0];
    if (Math.hypot(thief.x - old.x, thief.y - old.y) < 3) {
      pilot.index += 1;
      pilot.trail = [];
      if (pilot.index >= pilot.waypoints.length) pilot.done = true;
      return IDLE;
    }
  }
  return { x: dx / distance, y: dy / distance, sneak: pilot.sneak, tosses: [] };
}

/** Step the world under the pilot for at most `seconds`, stopping early when `until` holds. */
function runScene(world, pilot, seconds, until) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    world.step(STEP, pilot ? pilotInput(world, pilot) : IDLE);
    if (until && until(world)) return;
  }
}

/** The route in: the south hall's north street, up through the door, west to the first case. */
const CROSSING = [
  { x: 120, y: 566 }, { x: 515, y: 566 }, { x: 515, y: 466 }, { x: 400, y: 466 }, { x: 235, y: 468 },
];

/** The way to the Disk, in three legs with the waits the vault guard's round imposes: along
 *  the north street to the service gap, in through the gap once the guard starts up the wing,
 *  and up the wing behind him once he has turned away toward the east wall. */
const TO_THE_GAP = [{ x: 120, y: 566 }, { x: 960, y: 566 }];
const INTO_THE_WING = [{ x: 1086, y: 600 }];
const UP_THE_WING = [{ x: 1150, y: 452 }, { x: 1150, y: 318 }, { x: 1140, y: 225 }];

/** Play the thief to the pedestal and lift the Disk, timed around the vault guard's round. */
function liftTheDisk(world) {
  const gapPilot = createPilot(TO_THE_GAP);
  runScene(world, gapPilot, 20, () => gapPilot.done);
  runScene(world, null, Math.max(0, 11.6 - world.time), null);
  const wingPilot = createPilot(INTO_THE_WING);
  runScene(world, wingPilot, 10, () => wingPilot.done);
  runScene(world, null, Math.max(0, 14.3 - world.time), null);
  runScene(world, createPilot(UP_THE_WING), 20, (w) => w.hasDisk);
}

/** The route out again, Disk in the bag: down the wing, back along the north street, and a
 *  short drop west of the cases to the service door. */
const TO_THE_DOOR = [
  { x: 1150, y: 318 }, { x: 1150, y: 452 }, { x: 1086, y: 600 },
  { x: 960, y: 566 }, { x: 400, y: 566 }, { x: 250, y: 566 }, { x: 110, y: 580 }, { x: 56, y: 612 },
];

/**
 * Set `world` to the named scene (start, play, alarm or end; any other name is start) and
 * return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    const pilot = createPilot(CROSSING);
    runScene(world, pilot, 30, () => pilot.done);
    runScene(world, null, 0.5, null);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alarm') {
    liftTheDisk(world);
    // Caught in the vault camera's eye with the Disk in the bag: stand in its sweep and let
    // the meter climb until the frame is all tension, short of the trip itself — and freeze
    // on a moment the lens is actually on him, so the cone burns red in the frame.
    runScene(world, createPilot([{ x: 1186, y: 148 }]), 3, null);
    runScene(world, null, 12, (w) => (w.alarm.value >= 50 && w.cameras[1].sight > 0) || w.alarm.value >= 85 || w.phase !== 'play');
    return { screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    liftTheDisk(world);
    // A coin tossed back up the wing pulls the vault guard's eyes off the way out; a held
    // breath for it to land, then he runs for it — a creeping thief is a caught thief here.
    world.step(STEP, { x: 0, y: 0, sneak: false, tosses: [{ x: 1212, y: 330 }] });
    runScene(world, null, 0.4, null);
    runScene(world, createPilot(TO_THE_DOOR), 40, (w) => w.phase === PHASE_WON);
    return { screen: world.phase === PHASE_WON ? SCREEN_OVER : SCREEN_PLAY };
  }
  // The title: four seconds of the gallery waking up behind it, the thief at the door.
  runScene(world, null, 4, null);
  return { screen: SCREEN_TITLE };
}
