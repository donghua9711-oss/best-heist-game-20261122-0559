// The museum's guards: each walks a patrol route, stops and stares when it catches sight of
// the thief, walks over to look at a coin's ring or a last-seen spot, and hunts in earnest
// once the alarm has tripped. A guard's vision cone is its facing; it turns like a person,
// not a turret, so a quick thief can cross behind it.

import { GUARD, VISION } from './config.js';
import { sightStrength } from './vision.js';
import { steerToward, turnToward } from './movement.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_LOOK = 'look';
export const GUARD_HUNT = 'hunt';

const TURN_RATE = 3.4;
const ARRIVE = 8;

export function createGuard(route) {
  const start = route[0];
  const next = route[1 % route.length];
  return {
    x: start.x,
    y: start.y,
    radius: GUARD.radius,
    facing: Math.atan2(next.y - start.y, next.x - start.x),
    route,
    waypoint: 1 % route.length,
    mode: GUARD_PATROL,
    /** How clearly this guard sees the thief right now, 0..1 (vision.js). */
    sight: 0,
    /** The last place it saw or heard something worth walking to. */
    focus: null,
    lookFor: 0,
    lostFor: 0,
    memory: 0,
  };
}

/** Send a guard to look at a point (a coin landing, a glimpse): the hunt overrides it. */
export function distractGuard(guard, point) {
  if (guard.mode === GUARD_HUNT) return;
  guard.mode = GUARD_INVESTIGATE;
  guard.focus = { x: point.x, y: point.y };
  guard.lostFor = 0;
}

/**
 * Advance one guard. `thief` is the thief's body, `alarmTripped` whether the hunt is on;
 * returns this guard's sight strength of the thief this step.
 */
export function updateGuard(guard, dt, thief, solids, sightBlockers, alarmTripped) {
  guard.sight = sightStrength(
    guard.x, guard.y, guard.facing, VISION.guardRange, VISION.guardHalfAngle,
    thief.x, thief.y, sightBlockers,
  );

  if (guard.sight > 0) {
    guard.focus = { x: thief.x, y: thief.y };
    guard.memory = GUARD.memorySeconds;
    guard.lostFor = 0;
    if (alarmTripped) guard.mode = GUARD_HUNT;
    else if (guard.mode === GUARD_PATROL || guard.mode === GUARD_INVESTIGATE || guard.mode === GUARD_LOOK) {
      guard.mode = GUARD_SUSPICIOUS;
    }
  } else {
    guard.lostFor += dt;
    if (guard.memory > 0) guard.memory -= dt;
  }

  switch (guard.mode) {
    case GUARD_SUSPICIOUS: {
      // Stand and stare at the thief; a clear view for a moment is what pours the alarm in.
      if (guard.focus) turnToward(guard, Math.atan2(guard.focus.y - guard.y, guard.focus.x - guard.x), TURN_RATE * 1.6, dt);
      if (guard.lostFor > 0.8) {
        guard.mode = GUARD_INVESTIGATE;
      }
      break;
    }
    case GUARD_INVESTIGATE: {
      if (!guard.focus) {
        guard.mode = GUARD_PATROL;
        break;
      }
      if (steerToward(guard, guard.focus.x, guard.focus.y, GUARD.investigateSpeed, TURN_RATE, dt, solids) < ARRIVE) {
        guard.mode = GUARD_LOOK;
        guard.lookFor = GUARD.lookSeconds;
      }
      break;
    }
    case GUARD_LOOK: {
      // Turn on the spot, scanning: a fair chance to slip past, a bad place to stand still.
      guard.facing += dt * 1.5;
      guard.lookFor -= dt;
      if (guard.lookFor <= 0) {
        guard.mode = GUARD_PATROL;
        guard.focus = null;
      }
      break;
    }
    case GUARD_HUNT: {
      if (guard.memory <= 0 && guard.lostFor > 0.4) {
        guard.mode = GUARD_INVESTIGATE;
        break;
      }
      if (guard.focus) steerToward(guard, guard.focus.x, guard.focus.y, GUARD.huntSpeed, TURN_RATE * 1.3, dt, solids);
      break;
    }
    default: {
      // Patrol: walk the route, corner to corner, forever.
      const target = guard.route[guard.waypoint];
      if (steerToward(guard, target.x, target.y, GUARD.patrolSpeed, TURN_RATE, dt, solids) < ARRIVE) {
        guard.waypoint = (guard.waypoint + 1) % guard.route.length;
      }
    }
  }
  return guard.sight;
}
