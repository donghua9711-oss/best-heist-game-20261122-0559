// The night itself: the world state and its fixed-step simulation. The thief moves and hides,
// the guards and cameras watch, the alarm fills and drains, loot changes hands, lasers blink,
// and the night ends at the service door with the Sun Disk — or in a guard's grip without it.

import { ALARM, DISK, GUARD, LASER, THIEF } from './config.js';
import { buildLevel } from './level.js';
import { createAlarm } from './alarm.js';
import { createGuard, distractGuard, updateGuard } from './guards.js';
import { cameraSees, createCamera, updateCamera } from './cameras.js';
import { moveCircle } from './movement.js';

export const EVENT_LOOT = 1;
export const EVENT_TRIPPED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WON = 8;
export const EVENT_COIN = 16;
export const EVENT_LASER = 32;

const PHASE_PLAY = 'play';
export const PHASE_WON = 'won';
export const PHASE_CAUGHT = 'caught';

export function createWorld(random) {
  const level = buildLevel();
  const world = {
    level,
    random,
    thief: null,
    guards: [],
    cameras: [],
    alarm: null,
    loots: [],
    coins: [],
    floaters: [],
    time: 0,
    phase: PHASE_PLAY,
    hasDisk: false,
    liftProgress: 0,
    lootValue: 0,
    coinsLeft: THIEF.startCoins,
    laserSide: 0,
    laserFlash: 0,

    reset() {
      this.thief = {
        x: level.spawn.x,
        y: level.spawn.y,
        radius: THIEF.radius,
        facing: 0,
        moving: false,
        sneaking: false,
      };
      this.guards = level.patrolRoutes.map((route) => createGuard(route));
      this.cameras = level.cameras.map((definition) => createCamera(definition));
      this.alarm = createAlarm();
      this.loots = level.loots.map((loot) => ({ ...loot, taken: false }));
      this.coins = [];
      this.floaters = [];
      this.time = 0;
      this.phase = PHASE_PLAY;
      this.hasDisk = false;
      this.liftProgress = 0;
      this.lootValue = 0;
      this.coinsLeft = THIEF.startCoins;
      this.laserSide = Math.sign(level.spawn.x - level.lasers[0].x);
      this.laserFlash = 0;
    },

    /** Whether the laser grid is live at time `t` (all beams share one clock). */
    laserOn(t) {
      const cycle = LASER.onSeconds + LASER.offSeconds;
      return t % cycle < LASER.onSeconds;
    },

    /**
     * Advance the night one fixed step. `input` is {x, y, sneak, tosses} with a unit movement
     * vector and the coin tosses clicked this step; returns EVENT_* flags for what happened.
     */
    step(dt, input) {
      if (this.phase !== PHASE_PLAY) return 0;
      let events = 0;
      this.time += dt;
      const thief = this.thief;
      const solids = this.level.solids;

      // The thief: walk or creep, sliding along whatever is in the way.
      thief.sneaking = input.sneak;
      thief.moving = input.x !== 0 || input.y !== 0;
      if (thief.moving) {
        const speed = input.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
        thief.facing = Math.atan2(input.y, input.x);
        moveCircle(thief, input.x * speed * dt, input.y * speed * dt, solids);
      }

      // Coin tosses: a thrown coin lands, rings, and turns every nearby guard's head.
      for (let index = 0; index < input.tosses.length; index += 1) {
        if (this.coinsLeft <= 0) break;
        const point = input.tosses[index];
        const distance = Math.hypot(point.x - thief.x, point.y - thief.y);
        if (distance > THIEF.coinMaxThrow) continue;
        this.coinsLeft -= 1;
        this.coins.push({ x: point.x, y: point.y, age: 0, landed: false });
        events |= EVENT_COIN;
      }
      for (let index = this.coins.length - 1; index >= 0; index -= 1) {
        const coin = this.coins[index];
        coin.age += dt;
        if (!coin.landed && coin.age > 0.35) {
          coin.landed = true;
          for (let g = 0; g < this.guards.length; g += 1) {
            const guard = this.guards[g];
            if (Math.hypot(guard.x - coin.x, guard.y - coin.y) < THIEF.coinHearing) distractGuard(guard, coin);
          }
        }
        if (coin.age > 1.6) this.coins.splice(index, 1);
      }

      // The laser gate: crossing its plane while it is live is loud.
      const laser = this.level.lasers[0];
      const side = Math.sign(thief.x - laser.x);
      if (side !== 0 && this.laserSide !== 0 && side !== this.laserSide
        && thief.y > laser.y1 && thief.y < laser.y2 && this.laserOn(this.time)) {
        this.alarm.surge();
        this.laserFlash = 0.7;
        events |= EVENT_LASER;
      }
      if (side !== 0) this.laserSide = side;
      if (this.laserFlash > 0) this.laserFlash -= dt;

      // Cameras sweep; guards patrol, stare, investigate and hunt.
      let guardSight = 0;
      for (let index = 0; index < this.guards.length; index += 1) {
        const sight = updateGuard(this.guards[index], dt, thief, solids, this.level.sightBlockers, this.alarm.tripped);
        if (sight > guardSight) guardSight = sight;
      }
      let cameraSight = 0;
      for (let index = 0; index < this.cameras.length; index += 1) {
        updateCamera(this.cameras[index], this.time);
        const sight = cameraSees(this.cameras[index], thief, this.level.sightBlockers);
        if (sight > cameraSight) cameraSight = sight;
      }

      // A creeping thief is harder to make out: the meter fills slower while he sneaks.
      const sneakFactor = thief.sneaking ? 0.7 : 1;
      if (this.alarm.update(dt, guardSight * sneakFactor, cameraSight * sneakFactor)) {
        events |= EVENT_TRIPPED;
      }

      // A guard's grip ends the night, whatever the meter says.
      for (let index = 0; index < this.guards.length; index += 1) {
        const guard = this.guards[index];
        if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < GUARD.catchDistance) {
          this.phase = PHASE_CAUGHT;
          return events | EVENT_CAUGHT;
        }
      }

      // Side loot lifts itself as the thief passes; the Sun Disk takes both hands and time.
      for (let index = 0; index < this.loots.length; index += 1) {
        const loot = this.loots[index];
        if (loot.taken) continue;
        if (Math.hypot(loot.x - thief.x, loot.y - thief.y) < loot.radius) {
          loot.taken = true;
          this.lootValue += loot.value;
          this.floaters.push({ x: loot.x, y: loot.y - 24, text: `${loot.name} +$${loot.value.toLocaleString('en-US')}`, age: 0 });
          events |= EVENT_LOOT;
        }
      }
      if (!this.hasDisk) {
        const disk = this.level.disk;
        if (Math.hypot(disk.x - thief.x, disk.y - thief.y) < 58) {
          this.liftProgress += dt / DISK.liftSeconds;
          if (this.liftProgress >= 1) {
            this.hasDisk = true;
            this.lootValue += DISK.value;
            this.floaters.push({ x: disk.x, y: disk.y - 44, text: `The Sun Disk +$${DISK.value.toLocaleString('en-US')}`, age: 0 });
            events |= EVENT_LOOT;
          }
        } else if (this.liftProgress > 0) {
          this.liftProgress = Math.max(0, this.liftProgress - dt * 2);
        }
      }

      // Feedback text drifts up and fades.
      for (let index = this.floaters.length - 1; index >= 0; index -= 1) {
        const floater = this.floaters[index];
        floater.age += dt;
        floater.y -= dt * 22;
        if (floater.age > 1.6) this.floaters.splice(index, 1);
      }

      // The way out only counts with the Disk in the bag.
      const exit = this.level.exit;
      if (this.hasDisk
        && thief.x > exit.x - 6 && thief.x < exit.x + exit.w + 6
        && thief.y > exit.y && thief.y < exit.y + exit.h) {
        this.phase = PHASE_WON;
        events |= EVENT_WON;
      }
      return events;
    },
  };
  world.reset();
  return world;
}

export { PHASE_PLAY };
