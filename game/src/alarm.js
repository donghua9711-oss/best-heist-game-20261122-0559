// The alarm meter: the night's tension as one number. Being seen pours points in (a guard's
// eyes faster than a camera's lens, closer faster than far), hiding lets it drain, a tripped
// laser dumps a lump in at once, and at the top the alarm trips and the hunt is on.

import { ALARM, VISION } from './config.js';

export function createAlarm() {
  return {
    value: 0,
    /** The highest the meter ever reached this run, for the getaway grade. */
    peak: 0,
    /** Seconds since anyone last saw the thief; the drain waits for a quiet moment. */
    unseenFor: 0,
    tripped: false,

    /**
     * Advance the meter one step. `guardSight` and `cameraSight` are sight strengths (0..1)
     * from vision.js; returns true on the step the alarm trips.
     */
    update(dt, guardSight, cameraSight) {
      const seen = Math.max(guardSight, cameraSight);
      if (seen > 0) {
        this.unseenFor = 0;
        this.value += dt * (guardSight * VISION.guardRate + cameraSight * VISION.cameraRate);
      } else {
        this.unseenFor += dt;
        if (this.unseenFor > ALARM.decayDelay) this.value -= dt * ALARM.decay;
      }
      if (this.value > ALARM.max) this.value = ALARM.max;
      if (this.value < 0) this.value = 0;
      if (this.value > this.peak) this.peak = this.value;
      if (this.value >= ALARM.max && !this.tripped) {
        this.tripped = true;
        return true;
      }
      return false;
    },

    /** A laser's lump sum, all at once. */
    surge() {
      this.value = Math.min(ALARM.max, this.value + ALARM.laserHit);
      if (this.value > this.peak) this.peak = this.value;
    },
  };
}
