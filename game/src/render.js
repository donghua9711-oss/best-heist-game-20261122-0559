// Everything the player sees: the gallery floor and its furniture, the sweep of cones, the
// actors, the night's current goal marked with a pulsing ring and arrow so one glance at
// one frame finds it, the HUD with its alarm meter, and the title, pause and ending
// screens. Canvas 2D, drawn in field coordinates (1280x720); the page scales the canvas,
// never the art.

import { ALARM, FIELD, FONT_DISPLAY, FONT_UI, HUD_HEIGHT, PALETTE, VISION } from './config.js';
import { guardMood, MOOD_CALM, MOOD_HUNT, MOOD_SPOTTED } from './guards.js';
import { PHASE_CAUGHT, PHASE_WON } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TILE = 64;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawCone(x, y, facing, range, halfAngle, rgb, alert, t) {
    const pulse = alert ? 0.06 * Math.sin(t * 14) : 0;
    const gradient = ctx.createRadialGradient(x, y, 8, x, y, range);
    gradient.addColorStop(0, `rgba(${rgb}, ${0.34 + pulse})`);
    gradient.addColorStop(0.7, `rgba(${rgb}, ${0.16 + pulse / 2})`);
    gradient.addColorStop(1, `rgba(${rgb}, 0.02)`);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb}, ${alert ? 0.75 : 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawFloor(world) {
    const level = world.level;
    for (let row = 0; row * TILE < FIELD.height; row += 1) {
      for (let col = 0; col * TILE < FIELD.width; col += 1) {
        ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(col * TILE, Math.max(row * TILE, HUD_HEIGHT), TILE, TILE);
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= FIELD.width; x += TILE) {
      ctx.moveTo(x, HUD_HEIGHT);
      ctx.lineTo(x, FIELD.height);
    }
    for (let y = HUD_HEIGHT; y <= FIELD.height; y += TILE) {
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
    }
    ctx.stroke();
    // The processional carpets: a brass edge, a darker inner border, a lighter heart.
    for (const carpet of level.carpets) {
      ctx.fillStyle = PALETTE.carpet;
      ctx.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);
      ctx.strokeStyle = PALETTE.carpetEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(carpet.x + 3, carpet.y + 3, carpet.w - 6, carpet.h - 6);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.strokeRect(carpet.x + 9, carpet.y + 9, carpet.w - 18, carpet.h - 18);
      ctx.fillStyle = 'rgba(255, 190, 120, 0.05)';
      ctx.fillRect(carpet.x + 12, carpet.y + 12, carpet.w - 24, carpet.h - 24);
    }
  }

  function drawWalls(world) {
    for (const wall of world.level.walls) {
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = PALETTE.wall;
      const inset = Math.min(5, wall.w / 4, wall.h / 4);
      ctx.fillRect(wall.x + inset, wall.y + inset, wall.w - inset * 2, wall.h - inset * 2);
    }
  }

  function drawExit(world) {
    const exit = world.level.exit;
    const open = world.hasDisk;
    ctx.fillStyle = open ? '#1d4d33' : '#131a30';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.strokeStyle = open ? PALETTE.alarmCalm : PALETTE.brassDim;
    ctx.lineWidth = 2;
    ctx.strokeRect(exit.x + 2, exit.y + 2, exit.w - 4, exit.h - 4);
    ctx.save();
    ctx.translate(exit.x + exit.w / 2, exit.y + exit.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = open ? '#b8ffd2' : PALETTE.muted;
    ctx.font = `bold 15px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT — GO' : 'SERVICE DOOR', 0, 0);
    ctx.restore();
    if (open) {
      const glow = 0.25 + 0.15 * Math.sin(world.time * 5);
      ctx.fillStyle = `rgba(67, 209, 124, ${glow})`;
      ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    }
  }

  function drawCase(item) {
    ctx.fillStyle = PALETTE.caseWood;
    ctx.fillRect(item.x, item.y, item.w, item.h);
    const glass = ctx.createLinearGradient(item.x, item.y, item.x + item.w, item.y + item.h);
    glass.addColorStop(0, 'rgba(159, 216, 242, 0.30)');
    glass.addColorStop(0.5, 'rgba(159, 216, 242, 0.10)');
    glass.addColorStop(1, 'rgba(159, 216, 242, 0.24)');
    ctx.fillStyle = glass;
    ctx.fillRect(item.x + 7, item.y + 7, item.w - 14, item.h - 14);
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x + 1, item.y + 1, item.w - 2, item.h - 2);
    ctx.beginPath();
    ctx.moveTo(item.x + 12, item.y + item.h - 10);
    ctx.lineTo(item.x + item.w * 0.45, item.y + 10);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  function drawFurniture(world) {
    for (const item of world.level.furniture) {
      if (item.kind === 'case') {
        drawCase(item);
      } else if (item.kind === 'pillar') {
        ctx.fillStyle = PALETTE.pillar;
        ctx.fillRect(item.x, item.y, item.w, item.h);
        ctx.strokeStyle = PALETTE.brassDim;
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 5, item.y + 5, item.w - 10, item.h - 10);
      } else if (item.kind === 'planter') {
        ctx.fillStyle = PALETTE.planter;
        ctx.fillRect(item.x, item.y, item.w, item.h);
        ctx.fillStyle = PALETTE.leaf;
        const blobs = 6;
        for (let index = 0; index < blobs; index += 1) {
          const bx = item.x + 14 + (item.w - 28) * (index / (blobs - 1));
          ctx.beginPath();
          ctx.arc(bx, item.y + item.h / 2, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (item.kind === 'bench') {
        ctx.fillStyle = '#4a3421';
        ctx.fillRect(item.x, item.y, item.w, item.h);
        ctx.fillStyle = '#5d422a';
        for (let slat = 0; slat < 3; slat += 1) ctx.fillRect(item.x + 4, item.y + 4 + slat * 7, item.w - 8, 4);
      } else if (item.kind === 'pedestal') {
        ctx.fillStyle = '#3a4368';
        ctx.fillRect(item.x, item.y, item.w, item.h);
        ctx.strokeStyle = PALETTE.brass;
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 3, item.y + 3, item.w - 6, item.h - 6);
      }
    }
  }

  function drawLootGlyph(loot, t) {
    const { x, y } = loot;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 30);
    glow.addColorStop(0, 'rgba(255, 217, 77, 0.5)');
    glow.addColorStop(1, 'rgba(255, 217, 77, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 30, y - 30, 60, 60);
    ctx.fillStyle = PALETTE.loot;
    ctx.strokeStyle = '#a87e12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (loot.glyph === 'vase') {
      ctx.moveTo(x - 5, y - 13);
      ctx.quadraticCurveTo(x - 12, y + 2, x - 7, y + 12);
      ctx.lineTo(x + 7, y + 12);
      ctx.quadraticCurveTo(x + 12, y + 2, x + 5, y - 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (loot.glyph === 'tiara') {
      ctx.moveTo(x - 13, y + 8);
      ctx.lineTo(x - 9, y - 8);
      ctx.lineTo(x - 3, y + 1);
      ctx.lineTo(x, y - 12);
      ctx.lineTo(x + 3, y + 1);
      ctx.lineTo(x + 9, y - 8);
      ctx.lineTo(x + 13, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#57b6ff';
      ctx.beginPath();
      ctx.arc(x, y - 2, 3.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (loot.glyph === 'scarab') {
      ctx.ellipse(x, y, 10, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = PALETTE.loot;
      for (const side of [-1, 1]) {
        for (let leg = 0; leg < 3; leg += 1) {
          ctx.beginPath();
          ctx.moveTo(x + side * 9, y - 6 + leg * 6);
          ctx.lineTo(x + side * 16, y - 10 + leg * 7);
          ctx.stroke();
        }
      }
    } else if (loot.glyph === 'ingots') {
      for (const [ox, oy] of [[-11, 4], [1, 4], [-5, -5]]) {
        ctx.fillRect(x + ox, y + oy, 20, 8);
        ctx.strokeRect(x + ox, y + oy, 20, 8);
      }
    } else {
      // The jeweled chalice.
      ctx.moveTo(x - 11, y - 11);
      ctx.lineTo(x + 11, y - 11);
      ctx.quadraticCurveTo(x + 9, y + 4, x + 2, y + 5);
      ctx.lineTo(x + 2, y + 11);
      ctx.lineTo(x - 2, y + 11);
      ctx.lineTo(x - 2, y + 5);
      ctx.quadraticCurveTo(x - 9, y + 4, x - 11, y - 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // A slow sparkle over anything still worth stealing.
    const twinkle = (t * 0.9 + x * 0.01) % 1;
    if (twinkle < 0.4) {
      const s = 4 + twinkle * 10;
      ctx.strokeStyle = `rgba(255, 240, 180, ${0.8 - twinkle * 1.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 12, y - 16 - s);
      ctx.lineTo(x + 12, y - 16 + s);
      ctx.moveTo(x + 12 - s, y - 16);
      ctx.lineTo(x + 12 + s, y - 16);
      ctx.stroke();
    }
  }

  function drawDisk(world) {
    const disk = world.level.disk;
    if (world.hasDisk) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(disk.x, disk.y, 17, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const pool = ctx.createRadialGradient(disk.x, disk.y, 6, disk.x, disk.y, 96);
    pool.addColorStop(0, 'rgba(255, 217, 77, 0.34)');
    pool.addColorStop(1, 'rgba(255, 217, 77, 0)');
    ctx.fillStyle = pool;
    ctx.fillRect(disk.x - 96, disk.y - 96, 192, 192);
    ctx.save();
    ctx.translate(disk.x, disk.y);
    ctx.rotate(world.time * 0.25);
    ctx.fillStyle = PALETTE.loot;
    for (let ray = 0; ray < 12; ray += 1) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(19, -4.5);
      ctx.lineTo(30, 0);
      ctx.lineTo(19, 4.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(disk.x, disk.y, 19, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.loot;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#a87e12';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(disk.x, disk.y, 11, 0, Math.PI * 2);
    ctx.strokeStyle = '#a87e12';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(disk.x, disk.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#c23b3b';
    ctx.fill();
    // The lift ring: how close the Disk is to being in the bag.
    if (world.liftProgress > 0) {
      ctx.beginPath();
      ctx.arc(disk.x, disk.y, 27, -Math.PI / 2, -Math.PI / 2 + world.liftProgress * Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  function drawLasers(world) {
    const on = world.laserOn(world.time);
    for (const laser of world.level.lasers) {
      ctx.fillStyle = '#20263f';
      ctx.fillRect(laser.x - 7, laser.y1 - 12, 14, 14);
      ctx.fillRect(laser.x - 7, laser.y2 - 2, 14, 14);
      if (on) {
        ctx.save();
        ctx.shadowColor = PALETTE.laser;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = PALETTE.laser;
        ctx.lineWidth = 2.5;
        for (const offset of [-5, 0, 5]) {
          ctx.beginPath();
          ctx.moveTo(laser.x + offset, laser.y1);
          ctx.lineTo(laser.x + offset, laser.y2);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = PALETTE.laser;
        ctx.beginPath();
        ctx.arc(laser.x, laser.y1 - 5, 3, 0, Math.PI * 2);
        ctx.arc(laser.x, laser.y2 + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255, 59, 48, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(laser.x, laser.y1);
        ctx.lineTo(laser.x, laser.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (world.laserFlash > 0) {
      ctx.fillStyle = `rgba(255, 59, 48, ${world.laserFlash * 0.22})`;
      ctx.fillRect(960, 210, 110, 160);
    }
  }

  function drawActorShadow(x, y, radius) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.75, radius * 1.05, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawThief(world) {
    const thief = world.thief;
    drawActorShadow(thief.x, thief.y, thief.radius);
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, thief.radius, 0, Math.PI * 2);
    ctx.fillStyle = thief.sneaking ? PALETTE.thiefShade : PALETTE.thiefBody;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#57503e';
    ctx.stroke();
    // The hood, and the way he is facing.
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, thief.radius * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = '#3d3a33';
    ctx.fill();
    const noseX = thief.x + Math.cos(thief.facing) * thief.radius * 1.05;
    const noseY = thief.y + Math.sin(thief.facing) * thief.radius * 1.05;
    ctx.beginPath();
    ctx.arc(noseX, noseY, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = '#f5efdd';
    ctx.fill();
    if (world.hasDisk) {
      ctx.beginPath();
      ctx.arc(thief.x - Math.cos(thief.facing) * 8, thief.y - Math.sin(thief.facing) * 8, 5, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.loot;
      ctx.fill();
      ctx.strokeStyle = '#a87e12';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function drawGuard(guard, t) {
    drawActorShadow(guard.x, guard.y, guard.radius);
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.guardBody;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.guardDark;
    ctx.stroke();
    // The cap's brim shows the facing at a glance.
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius * 0.66,
      guard.facing - 1.15, guard.facing + 1.15);
    ctx.lineTo(guard.x, guard.y);
    ctx.closePath();
    ctx.fillStyle = PALETTE.guardDark;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing) * 6, guard.y + Math.sin(guard.facing) * 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f6d8a8';
    ctx.fill();
    // What the guard is thinking, in the oldest notation there is: a bubble floating
    // above its head — an amber '?' while it is only curious (staring, investigating,
    // scanning), a red '!' once it is sure of the thief or the hunt is on.
    const mood = guardMood(guard);
    if (mood !== MOOD_CALM) {
      const sure = mood === MOOD_SPOTTED || mood === MOOD_HUNT;
      const bob = Math.sin(t * 6) * 1.6;
      const bx = guard.x;
      const by = guard.y - guard.radius - 13 + bob;
      if (mood === MOOD_HUNT) {
        ctx.beginPath();
        ctx.arc(bx, by, 11.5 + Math.sin(t * 10) * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 83, 71, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.fillStyle = sure ? '#ff5347' : '#ffd94d';
      ctx.fill();
      ctx.strokeStyle = 'rgba(10, 8, 4, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#14100a';
      ctx.font = `bold 13px ${FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sure ? '!' : '?', bx, by + 0.5);
    }
  }

  function drawCamera(camera) {
    ctx.fillStyle = PALETTE.cameraBody;
    ctx.fillRect(camera.x - 9, camera.y - 7, 18, 14);
    ctx.beginPath();
    ctx.arc(camera.x + Math.cos(camera.angle) * 8, camera.y + Math.sin(camera.angle) * 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#14100a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(camera.x - 5, camera.y - 10, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = camera.sight > 0 ? '#ff5347' : '#43d17c';
    ctx.fill();
  }

  function drawCoins(world) {
    for (const coin of world.coins) {
      if (!coin.landed) {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.loot;
        ctx.fill();
      } else {
        const ring = (coin.age - 0.35) / 1.25;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 6 + ring * 46, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 217, 77, ${0.75 * (1 - ring)})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.loot;
        ctx.fill();
      }
    }
  }

  /**
   * The night's current goal, marked so a single glance at a single frame finds it: a
   * pulsing outline around the target and a labelled arrow bobbing above it — gold over
   * the Sun Disk while it waits on its pedestal, green over the service door once the
   * Disk is in the bag and the door is the goal.
   */
  function drawObjectiveMarker(world) {
    const t = world.time;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.4);
    let x;
    let y;
    let label;
    if (world.hasDisk) {
      const exit = world.level.exit;
      x = exit.x + exit.w / 2;
      y = exit.y + exit.h / 2;
      label = 'EXIT';
      const grow = pulse * 3;
      ctx.strokeStyle = `rgba(67, 209, 124, ${0.55 + 0.35 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(exit.x - 3 - grow, exit.y - 3 - grow, exit.w + 6 + grow * 2, exit.h + 6 + grow * 2);
    } else {
      const disk = world.level.disk;
      x = disk.x;
      y = disk.y;
      label = 'SUN DISK';
      for (const ring of [0, 1]) {
        ctx.beginPath();
        ctx.arc(x, y, 31 + ring * 9 + pulse * 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 217, 77, ${ring === 0 ? 0.85 : 0.38})`;
        ctx.lineWidth = ring === 0 ? 2.6 : 1.6;
        ctx.stroke();
      }
    }
    // The arrow: a chevron bobbing above the mark, pointing down at the goal, its name
    // lettered over it on a dark stroke so it survives being shrunk to a thumbnail. A
    // soft dark halo sits behind both, so the mark reads even over a lit carpet or a
    // bright cone where gold on gold would vanish.
    const tipY = y - 54 - Math.sin(t * 3.4) * 5;
    ctx.beginPath();
    ctx.ellipse(x, tipY - 17, 42, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(7, 10, 20, 0.48)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 11, tipY - 12);
    ctx.lineTo(x + 11, tipY - 12);
    ctx.lineTo(x, tipY);
    ctx.closePath();
    ctx.fillStyle = world.hasDisk ? '#43d17c' : PALETTE.loot;
    ctx.fill();
    ctx.strokeStyle = 'rgba(10, 8, 4, 0.6)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.font = `bold 12.5px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(7, 10, 20, 0.85)';
    ctx.strokeText(label, x, tipY - 24);
    ctx.fillStyle = world.hasDisk ? '#b8ffd2' : '#ffe98a';
    ctx.fillText(label, x, tipY - 24);
  }

  function drawHud(world, best) {
    ctx.fillStyle = '#0a0e1d';
    ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(0, HUD_HEIGHT - 3, FIELD.width, 3);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.brass;
    ctx.font = `bold 21px ${FONT_DISPLAY}`;
    ctx.fillText('THE NIGHT VAULT', 18, 26);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11.5px ${FONT_UI}`;
    ctx.fillText('Ashworth Museum — the Meridian Gallery, one night shift', 18, 48);

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15.5px ${FONT_UI}`;
    const objective = world.hasDisk
      ? 'The Disk is yours — reach the service door'
      : 'Lift the Sun Disk from the vault wing (east)';
    ctx.fillText(objective, 618, 26);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT_UI}`;
    const pieces = world.loots.filter((loot) => loot.taken).length;
    ctx.fillText(`Side pieces ${pieces} of ${world.loots.length} · Best haul $${Math.max(best, world.lootValue).toLocaleString('en-US')}`, 618, 47);

    // The alarm meter: twenty-four segments that fill with the night's noise.
    const meterX = 872;
    const meterY = 14;
    const segments = 24;
    ctx.textAlign = 'left';
    ctx.fillStyle = world.alarm.tripped ? PALETTE.alarmTripped : PALETTE.text;
    ctx.font = `bold 13px ${FONT_UI}`;
    ctx.fillText(world.alarm.tripped ? 'ALARM — RUN!' : 'ALARM', meterX, meterY + 6);
    const lit = Math.round((world.alarm.value / ALARM.max) * segments);
    for (let index = 0; index < segments; index += 1) {
      const fraction = (index + 1) / segments;
      ctx.fillStyle = index < lit
        ? (fraction < 0.5 ? PALETTE.alarmCalm : fraction < 0.8 ? PALETTE.alarmWary : PALETTE.alarmTripped)
        : 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(meterX + 74 + index * 11, meterY, 8, 13);
    }
    ctx.fillStyle = PALETTE.loot;
    ctx.font = `bold 16px ${FONT_UI}`;
    ctx.fillText(`$${world.lootValue.toLocaleString('en-US')}`, meterX, 47);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12.5px ${FONT_UI}`;
    const minutes = Math.floor(world.time / 60);
    const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
    ctx.fillText(`coins ${'●'.repeat(world.coinsLeft)}${'○'.repeat(3 - world.coinsLeft)} · ${minutes}:${seconds}`, meterX + 118, 47);
  }

  function panel(width, height) {
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    ctx.fillStyle = 'rgba(7, 10, 20, 0.82)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    return { x, y };
  }

  function drawTitle(world, best) {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.52)';
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
    const { x, y } = panel(700, 252);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.brass;
    ctx.font = `bold 54px ${FONT_DISPLAY}`;
    ctx.fillText('THE NIGHT VAULT', FIELD.width / 2, y + 58);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16.5px ${FONT_UI}`;
    ctx.fillText('One thief. One golden disk. Three guards who would rather you left empty-handed.', FIELD.width / 2, y + 102);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14.5px ${FONT_UI}`;
    ctx.fillText('Cross the gallery in the dark, mind the cones and the cameras, lift the Sun Disk,', FIELD.width / 2, y + 132);
    ctx.fillText('and slip out the service door. Fill the alarm meter and the hunt is on.', FIELD.width / 2, y + 154);
    ctx.fillStyle = PALETTE.loot;
    ctx.font = `bold 15.5px ${FONT_UI}`;
    ctx.fillText('WASD or arrows — move · Shift — sneak · Click — toss a coin · P — pause · R — restart', FIELD.width / 2, y + 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT_UI}`;
    ctx.fillText(best > 0 ? `Press Enter or click to begin — best haul $${best.toLocaleString('en-US')}` : 'Press Enter or click to begin', FIELD.width / 2, y + 222);
    void x;
  }

  function gradeFor(world) {
    if (world.alarm.tripped) return 'SMASH AND GRAB';
    if (world.alarm.peak < 5) return 'GHOST — never seen';
    if (world.alarm.peak < 35) return 'PHANTOM';
    if (world.alarm.peak < 70) return 'SHADOW';
    return 'LOUD, BUT GONE';
  }

  function drawOver(world) {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.55)';
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
    const won = world.phase === PHASE_WON;
    const { y } = panel(600, 300);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? PALETTE.loot : PALETTE.alarmTripped;
    ctx.font = `bold 46px ${FONT_DISPLAY}`;
    ctx.fillText(won ? 'CLEAN GETAWAY' : 'CAUGHT', FIELD.width / 2, y + 54);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16px ${FONT_UI}`;
    ctx.fillText(won ? 'Out the service door and into the night.' : 'A guard’s hand closes on your collar in the dark.', FIELD.width / 2, y + 88);
    const pieces = world.loots.filter((loot) => loot.taken).length;
    const minutes = Math.floor(world.time / 60);
    const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
    const rows = [
      ['Loot hauled', `$${world.lootValue.toLocaleString('en-US')}`],
      ['Side pieces', `${pieces} of ${world.loots.length}`],
      ['Time inside', `${minutes}:${seconds}`],
      ['Peak alarm', `${Math.round(world.alarm.peak)}%`],
    ];
    ctx.font = `15.5px ${FONT_UI}`;
    rows.forEach(([label, value], index) => {
      const rowY = y + 126 + index * 27;
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(label, FIELD.width / 2 - 14, rowY);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(value, FIELD.width / 2 + 14, rowY);
    });
    if (won) {
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.brass;
      ctx.font = `bold 21px ${FONT_DISPLAY}`;
      ctx.fillText(`Grade: ${gradeFor(world)}`, FIELD.width / 2, y + 248);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT_UI}`;
    ctx.fillText('Press R or click to play again', FIELD.width / 2, y + 278);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.55)';
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 40px ${FONT_DISPLAY}`;
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
    ctx.font = `15px ${FONT_UI}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('The gallery holds its breath. P to resume.', FIELD.width / 2, FIELD.height / 2 + 36);
  }

  return {
    draw(world, screen, best) {
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawFloor(world);
      drawExit(world);
      drawFurniture(world);
      for (const loot of world.loots) if (!loot.taken) drawLootGlyph(loot, world.time);
      drawDisk(world);
      drawLasers(world);
      // Cones under the actors: cameras first, then guards, alert watchers burning red.
      for (const camera of world.cameras) {
        drawCone(camera.x, camera.y, camera.angle, VISION.cameraRange, VISION.cameraHalfAngle,
          camera.sight > 0 ? PALETTE.coneAlert : PALETTE.coneCamera, camera.sight > 0, world.time);
      }
      for (const guard of world.guards) {
        drawCone(guard.x, guard.y, guard.facing, VISION.guardRange, VISION.guardHalfAngle,
          guard.sight > 0 ? PALETTE.coneAlert : PALETTE.coneGuard, guard.sight > 0, world.time);
      }
      drawWalls(world);
      drawCoins(world);
      drawThief(world);
      for (const guard of world.guards) drawGuard(guard, world.time);
      for (const camera of world.cameras) drawCamera(camera);
      drawObjectiveMarker(world);
      // What the night just paid out, drifting up off the cases.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const floater of world.floaters) {
        ctx.fillStyle = `rgba(255, 217, 77, ${1 - floater.age / 1.6})`;
        ctx.font = `bold 15px ${FONT_UI}`;
        ctx.fillText(floater.text, floater.x, floater.y);
      }
      drawHud(world, best);
      if (screen === SCREEN_TITLE) drawTitle(world, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(world);
    },
  };
}
