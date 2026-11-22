// The Meridian Gallery of the Ashworth Museum, one room on one night shift: its walls, the
// furniture the thief hides behind, the patrol routes, the cameras, the laser gate on the vault
// wing, the loot and the way out. Everything the world and the renderer need, as plain data.

/** A rectangle helper so the layout below reads like a floor plan. */
function rect(x, y, w, h) {
  return { x, y, w, h };
}

/**
 * The gallery's fixed layout. Coordinates are the 1280x720 field; the HUD band sits above y=64.
 * Three halls (north gallery, central hall, south hall) divided by partitions with door gaps,
 * and a vault wing on the right behind a laser-guarded doorway and one open service gap.
 */
export function buildLevel() {
  const walls = [
    // The room's own walls.
    rect(0, 64, 1280, 20),
    rect(0, 700, 1280, 20),
    rect(0, 64, 20, 656),
    rect(1260, 64, 20, 656),
    // Partition between the north gallery and the central hall; door gaps at x 300-390, 700-790.
    rect(20, 290, 280, 20),
    rect(390, 290, 310, 20),
    rect(790, 290, 210, 20),
    // Partition between the central hall and the south hall; one door gap at x 470-560.
    rect(20, 520, 450, 20),
    rect(560, 520, 440, 20),
    // The vault wing's wall; a laser-guarded doorway at y 230-350 and a service gap at y 560-640.
    rect(1000, 84, 20, 146),
    rect(1000, 350, 20, 210),
    rect(1000, 640, 20, 60),
  ];

  // Furniture: display cases and pillars are tall (they block sight); planters and benches are
  // low (they block the feet, not the eyes). All of them block movement.
  const furniture = [
    { ...rect(180, 150, 120, 54), kind: 'case', tall: true },
    { ...rect(520, 150, 120, 54), kind: 'case', tall: true },
    { ...rect(800, 150, 120, 54), kind: 'case', tall: true },
    { ...rect(170, 382, 130, 56), kind: 'case', tall: true },
    { ...rect(430, 382, 130, 56), kind: 'case', tall: true },
    { ...rect(690, 382, 130, 56), kind: 'case', tall: true },
    { ...rect(240, 590, 120, 54), kind: 'case', tall: true },
    { ...rect(620, 590, 120, 54), kind: 'case', tall: true },
    { ...rect(352, 388, 36, 36), kind: 'pillar', tall: true },
    { ...rect(892, 388, 36, 36), kind: 'pillar', tall: true },
    { ...rect(470, 598, 36, 36), kind: 'pillar', tall: true },
    { ...rect(892, 598, 36, 36), kind: 'pillar', tall: true },
    { ...rect(90, 660, 150, 26), kind: 'planter', tall: false },
    { ...rect(760, 660, 150, 26), kind: 'planter', tall: false },
    { ...rect(250, 448, 100, 24), kind: 'bench', tall: false },
    { ...rect(700, 448, 100, 24), kind: 'bench', tall: false },
  ];

  // The Sun Disk's pedestal, in the vault wing: solid, tall, and the night's whole point.
  const disk = { x: 1140, y: 190, pedestal: rect(1112, 162, 56, 56) };
  furniture.push({ ...disk.pedestal, kind: 'pedestal', tall: true });

  const sightBlockers = walls.concat(furniture.filter((item) => item.tall).map((item) => rect(item.x, item.y, item.w, item.h)));
  const solids = walls.concat(furniture.map((item) => rect(item.x, item.y, item.w, item.h)));

  return {
    walls,
    furniture,
    solids,
    sightBlockers,
    disk,
    // Where the thief comes in, and the only way out: the service door on the west wall.
    spawn: { x: 74, y: 612 },
    exit: rect(20, 572, 58, 80),
    // Side loot, lifted by standing close. The Disk itself is handled apart (it takes time).
    loots: [
      { id: 'vase', name: 'Ivory Vase', value: 900, x: 240, y: 177, radius: 58, glyph: 'vase' },
      { id: 'tiara', name: 'Sapphire Tiara', value: 2200, x: 580, y: 177, radius: 58, glyph: 'tiara' },
      { id: 'scarab', name: 'Emerald Scarab', value: 1500, x: 495, y: 410, radius: 58, glyph: 'scarab' },
      { id: 'ingots', name: 'Gold Ingots', value: 1200, x: 680, y: 617, radius: 58, glyph: 'ingots' },
      { id: 'chalice', name: 'Jeweled Chalice', value: 1800, x: 235, y: 410, radius: 58, glyph: 'chalice' },
    ],
    patrolRoutes: [
      // The north gallery guard, walking the paintings along both aisles of the cases.
      [{ x: 110, y: 232 }, { x: 950, y: 232 }, { x: 950, y: 120 }, { x: 110, y: 120 }],
      // The central hall guard, circling the eastern cases; the west end is the camera's watch.
      [{ x: 580, y: 492 }, { x: 950, y: 492 }, { x: 950, y: 338 }, { x: 580, y: 338 }],
      // The vault guard, walking the wing and the south hall's east end.
      [{ x: 1150, y: 648 }, { x: 1150, y: 440 }, { x: 1086, y: 356 }, { x: 1214, y: 356 }],
    ],
    cameras: [
      // Over the central hall's north doors, sweeping the hall.
      { x: 640, y: 92, baseAngle: Math.PI / 2, sweep: 0.85, period: 7.5, phase: 0 },
      // In the vault wing's corner, sweeping the Sun Disk and its approach.
      { x: 1246, y: 104, baseAngle: 2.62, sweep: 0.55, period: 6.0, phase: 2.1 },
    ],
    // The laser grid across the vault doorway, on the plane x=1010 between y 230 and y 350.
    lasers: [{ x: 1010, y1: 230, y2: 350 }],
    // Red carpet runners, drawn under everything: one down each hall's walking band and one
    // up the vault wing, the gallery's processional routes.
    carpets: [
      rect(56, 204, 908, 52),
      rect(56, 436, 908, 58),
      rect(56, 558, 1184, 88),
      rect(1096, 250, 88, 410),
    ],
  };
}
