// Moving round bodies through a rectangular world: the thief and the guards are circles, the
// walls and furniture are rectangles, and movement resolves one axis at a time so a body
// slides along a wall it runs into instead of sticking to it.

import { angleDifference } from './vision.js';

/** Move `body` (an {x, y, radius}) by (dx, dy), stopping at the solids. */
export function moveCircle(body, dx, dy, solids) {
  body.x += dx;
  for (let index = 0; index < solids.length; index += 1) {
    const rect = solids[index];
    if (circleHitsRect(body, rect)) {
      body.x = dx > 0 ? rect.x - body.radius : rect.x + rect.w + body.radius;
    }
  }
  body.y += dy;
  for (let index = 0; index < solids.length; index += 1) {
    const rect = solids[index];
    if (circleHitsRect(body, rect)) {
      body.y = dy > 0 ? rect.y - body.radius : rect.y + rect.h + body.radius;
    }
  }
}

/** True when the circle overlaps the rectangle. */
export function circleHitsRect(circle, rect) {
  const nearX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - nearX;
  const dy = circle.y - nearY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

/** Turn `body.facing` toward `heading` at most `rate` radians a second. */
export function turnToward(body, heading, rate, dt) {
  const diff = angleDifference(body.facing, heading);
  const step = rate * dt;
  body.facing += Math.max(-step, Math.min(step, diff));
}

/**
 * Steer `body` toward the point (tx, ty) at `speed`, turning at `turnRate`: returns the
 * distance left to the point, so a caller can tell when it has arrived.
 */
export function steerToward(body, tx, ty, speed, turnRate, dt, solids) {
  const dx = tx - body.x;
  const dy = ty - body.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) return 0;
  turnToward(body, Math.atan2(dy, dx), turnRate, dt);
  const step = Math.min(speed * dt, distance);
  moveCircle(body, (dx / distance) * step, (dy / distance) * step, solids);
  return distance - step;
}
