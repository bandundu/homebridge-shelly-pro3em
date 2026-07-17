'use strict';

const HOMEKIT_MIN_LUX = 0.0001;
const HOMEKIT_MAX_LUX = 100000;

function calculatePowerSensors(totalActivePower, options = {}) {
  const rawPower = Number(totalActivePower);
  if (!Number.isFinite(rawPower)) {
    throw new TypeError('Shelly total_act_power must be a finite number');
  }

  const direction = options.invertDirection ? -1 : 1;
  const deadbandWatts = Math.max(0, Number(options.deadbandWatts) || 0);
  let signedPower = rawPower * direction;

  if (Math.abs(signedPower) < deadbandWatts) {
    signedPower = 0;
  }

  return {
    import: Math.max(signedPower, 0),
    export: Math.max(-signedPower, 0),
    net: Math.abs(signedPower),
    signed: signedPower,
  };
}

function wattsToLux(watts) {
  const numericWatts = Number(watts);
  if (!Number.isFinite(numericWatts)) {
    throw new TypeError('Wattage must be a finite number');
  }

  return Math.min(HOMEKIT_MAX_LUX, Math.max(HOMEKIT_MIN_LUX, numericWatts));
}

module.exports = {
  HOMEKIT_MAX_LUX,
  HOMEKIT_MIN_LUX,
  calculatePowerSensors,
  wattsToLux,
};
