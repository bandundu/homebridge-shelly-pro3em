'use strict';

const { calculatePowerSensors, wattsToLux } = require('./power');

const PLUGIN_NAME = 'homebridge-shelly-pro3em';
const PLATFORM_NAME = 'ShellyPro3EM';
const SENSOR_DEFINITIONS = [
  { key: 'import', defaultName: 'Base Load', configKey: 'consumptionSensorName' },
  { key: 'export', defaultName: 'Surplus', configKey: 'surplusSensorName' },
  { key: 'net', defaultName: 'Absolute Grid Flow', configKey: 'netFlowSensorName' },
];

class ShellyPro3EMPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config || {};
    this.api = api;
    this.accessories = new Map();
    this.pollTimer = undefined;
    this.stopped = false;

    this.name = this.config.name || 'Shelly Pro 3EM';
    this.ip = normalizeHost(this.config.ip);
    this.pollIntervalSeconds = Math.max(2, Number(this.config.pollIntervalSeconds) || 10);
    this.requestTimeoutSeconds = Math.max(1, Number(this.config.requestTimeoutSeconds) || 5);
    this.deadbandWatts = Math.max(0, Number(this.config.deadbandWatts) || 1);
    this.invertDirection = Boolean(this.config.invertDirection);

    if (!this.ip) {
      this.log.error('No Shelly IP address configured. Set "ip" to an address such as 192.168.0.24.');
      return;
    }

    this.api.on('didFinishLaunching', () => this.start());
    this.api.on('shutdown', () => this.stop());
  }

  configureAccessory(accessory) {
    this.accessories.set(accessory.UUID, accessory);
  }

  start() {
    for (const definition of SENSOR_DEFINITIONS) {
      this.ensureSensorAccessory(definition);
    }

    this.log.info(
      'Polling Shelly Pro 3EM at %s every %s seconds%s.',
      this.ip,
      this.pollIntervalSeconds,
      this.invertDirection ? ' with direction inverted' : '',
    );

    void this.poll();
  }

  stop() {
    this.stopped = true;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  ensureSensorAccessory(definition) {
    const uuid = this.api.hap.uuid.generate(`${PLUGIN_NAME}:${this.ip}:${definition.key}`);
    const configuredName = String(this.config[definition.configKey] || '').trim();
    const sensorName = configuredName || `${this.name} ${definition.defaultName}`;
    let accessory = this.accessories.get(uuid);

    if (!accessory) {
      accessory = new this.api.platformAccessory(sensorName, uuid);
      accessory.context.sensorKey = definition.key;
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.set(uuid, accessory);
      this.log.info('Created Apple Home sensor: %s', accessory.displayName);
    }

    accessory.context.sensorKey = definition.key;
    const { Service, Characteristic } = this.api.hap;
    const service = accessory.getService(Service.LightSensor)
      || accessory.addService(Service.LightSensor, accessory.displayName);

    service.setCharacteristic(Characteristic.Name, accessory.displayName);
    service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(wattsToLux(0));

    const information = accessory.getService(Service.AccessoryInformation);
    information
      .setCharacteristic(Characteristic.Manufacturer, 'Shelly')
      .setCharacteristic(Characteristic.Model, 'Pro 3EM virtual watt sensor')
      .setCharacteristic(Characteristic.SerialNumber, `${this.ip}-${definition.key}`)
      .setCharacteristic(Characteristic.FirmwareRevision, '0.1.0');
  }

  async poll() {
    try {
      const status = await this.fetchStatus();
      const readings = calculatePowerSensors(status.total_act_power, {
        invertDirection: this.invertDirection,
        deadbandWatts: this.deadbandWatts,
      });

      this.updateSensors(readings, false);
      this.log.debug(
        'Power: signed=%s W, import=%s W, export=%s W, net=%s W.',
        readings.signed,
        readings.import,
        readings.export,
        readings.net,
      );
    } catch (error) {
      this.updateSensors(undefined, true);
      this.log.error('Could not read Shelly Pro 3EM: %s', error.message);
    } finally {
      if (!this.stopped) {
        this.pollTimer = setTimeout(() => void this.poll(), this.pollIntervalSeconds * 1000);
      }
    }
  }

  async fetchStatus() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutSeconds * 1000);
    const endpoint = `http://${this.ip}/rpc/EM.GetStatus?id=0`;

    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${endpoint}`);
      }

      const status = await response.json();
      if (!Number.isFinite(Number(status.total_act_power))) {
        throw new Error('Shelly response did not contain a valid total_act_power value');
      }

      return status;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`request timed out after ${this.requestTimeoutSeconds} seconds`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  updateSensors(readings, faulted) {
    const { Service, Characteristic } = this.api.hap;

    for (const accessory of this.accessories.values()) {
      const sensorKey = accessory.context.sensorKey;
      if (!SENSOR_DEFINITIONS.some((definition) => definition.key === sensorKey)) {
        continue;
      }

      const service = accessory.getService(Service.LightSensor);
      if (!service) {
        continue;
      }

      service.getCharacteristic(Characteristic.StatusFault).updateValue(
        faulted ? Characteristic.StatusFault.GENERAL_FAULT : Characteristic.StatusFault.NO_FAULT,
      );

      if (!faulted && readings) {
        service.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
          .updateValue(wattsToLux(readings[sensorKey]));
      }
    }
  }
}

function normalizeHost(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

module.exports = {
  ShellyPro3EMPlatform,
  normalizeHost,
};
