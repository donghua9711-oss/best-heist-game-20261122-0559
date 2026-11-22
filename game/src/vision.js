// Who can see the thief: vision cones (a guard's eyes, a camera's lens) and the line of sight
// past the gallery's walls and tall furniture. Pure geometry, no state of its own.

/** The signed smallest turn from angle `from` to angle `to`, in (-PI, PI]. */
export function angleDifference(from, to) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** True when (px, py) is inside the rectangle. */
function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

/** True when the two segments cross (touching counts). */
function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    || (d1 === 0 && pointOnSegment(cx, cy, dx, dy, ax, ay))
    || (d2 === 0 && pointOnSegment(cx, cy, dx, dy, bx, by))
    || (d3 === 0 && pointOnSegment(ax, ay, bx, by, cx, cy))
    || (d4 === 0 && pointOnSegment(ax, ay, bx, by, dx, dy));
}

function pointOnSegment(ax, ay, bx, by, px, py) {
  return px >= Math.min(ax, bx) && px <= Math.max(ax, bx) && py >= Math.min(ay, by) && py <= Math.max(ay, by);
}

/** True when the straight line from (x1, y1) to (x2, y2) runs into any of the rectangles. */
export function lineBlocked(x1, y1, x2, y2, blockers) {
  for (let index = 0; index < blockers.length; index += 1) {
    const rect = blockers[index];
    if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
    const right = rect.x + rect.w;
    const bottom = rect.y + rect.h;
    if (segmentsCross(x1, y1, x2, y2, rect.x, rect.y, right, rect.y)) return true;
    if (segmentsCross(x1, y1, x2, y2, right, rect.y, right, bottom)) return true;
    if (segmentsCross(x1, y1, x2, y2, right, bottom, rect.x, bottom)) return true;
    if (segmentsCross(x1, y1, x2, y2, rect.x, bottom, rect.x, rect.y)) return true;
  }
  return false;
}

/**
 * How clearly an eye at (ox, oy) facing `facing` sees the point (px, py): 0 when it is outside
 * the cone's range or arc or hidden behind a blocker, else a strength from 0 (at the cone's rim)
 * to 1 (close and dead ahead) that the alarm meter feeds on.
 */
export function sightStrength(ox, oy, facing, range, halfAngle, px, py, blockers) {
  const dx = px - ox;
  const dy = py - oy;
  const distance = Math.hypot(dx, dy);
  if (distance > range || distance < 1) return 0;
  const offAxis = Math.abs(angleDifference(facing, Math.atan2(dy, dx)));
  if (offAxis > halfAngle) return 0;
  if (lineBlocked(ox, oy, px, py, blockers)) return 0;
  const closeness = 1 - distance / range;
  const centredness = 1 - offAxis / halfAngle;
  return 0.35 + 0.65 * closeness * (0.5 + 0.5 * centredness);
}
