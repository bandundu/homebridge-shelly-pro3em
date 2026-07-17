'use strict';

const { ShellyPro3EMPlatform } = require('./lib/platform');

const PLUGIN_NAME = 'homebridge-shelly-pro3em';
const PLATFORM_NAME = 'ShellyPro3EM';

module.exports = (api) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, ShellyPro3EMPlatform);
};

module.exports.PLUGIN_NAME = PLUGIN_NAME;
module.exports.PLATFORM_NAME = PLATFORM_NAME;
