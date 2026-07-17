'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePowerSensors, wattsToLux } = require('../lib/power');
const { normalizeHost } = require('../lib/platform');

test('positive power is grid import', () => {
  assert.deepEqual(calculatePowerSensors(850), {
    import: 850,
    export: 0,
    net: 850,
    signed: 850,
  });
});

test('negative power is grid export', () => {
  assert.deepEqual(calculatePowerSensors(-420), {
    import: 0,
    export: 420,
    net: 420,
    signed: -420,
  });
});

test('direction can be inverted', () => {
  assert.deepEqual(calculatePowerSensors(300, { invertDirection: true }), {
    import: 0,
    export: 300,
    net: 300,
    signed: -300,
  });
});

test('deadband removes near-zero meter noise', () => {
  assert.deepEqual(calculatePowerSensors(-0.8, { deadbandWatts: 1 }), {
    import: 0,
    export: 0,
    net: 0,
    signed: 0,
  });
});

test('watt values are constrained to the HomeKit light level range', () => {
  assert.equal(wattsToLux(0), 0.0001);
  assert.equal(wattsToLux(123.456), 123.456);
  assert.equal(wattsToLux(150000), 100000);
});

test('IP configuration accepts a bare IP or URL', () => {
  assert.equal(normalizeHost('192.168.0.24'), '192.168.0.24');
  assert.equal(normalizeHost('http://192.168.0.24/'), '192.168.0.24');
});
