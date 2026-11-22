// The gallery's security cameras: wall-mounted lenses that sweep their sector on a slow sine,
// patient and predictable. A camera that sees the thief pours the alarm in more slowly than a
// guard's eyes, but it never blinks, never leaves its post, and cannot be distracted by a coin.

import { VISION } from './config.js';
import { sightStrength } from './vision.js';

export function createCamera(definition) {
  return {
    x: definition.x,
    y: definition.y,
    baseAngle: definition.baseAngle,
    sweep: definition.sweep,
    period: definition.period,
    phase: definition.phase,
    angle: definition.baseAngle,
    /** How clearly this camera sees the thief right now, 0..1 (vision.js). */
    sight: 0,
  };
}

/** Swing the lens to where its sweep has it at time `t` seconds. */
export function updateCamera(camera, t) {
  camera.angle = camera.baseAngle + Math.sin((t * Math.PI * 2) / camera.period + camera.phase) * camera.sweep;
}

/** This camera's sight strength of the thief, cone and line of sight both counted. */
export function cameraSees(camera, thief, sightBlockers) {
  camera.sight = sightStrength(
    camera.x, camera.y, camera.angle, VISION.cameraRange, VISION.cameraHalfAngle,
    thief.x, thief.y, sightBlockers,
  );
  return camera.sight;
}
