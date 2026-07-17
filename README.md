# homebridge-shelly-pro3em

A Homebridge platform plugin that exposes a Shelly Pro 3EM's total active power as three standard Apple Home light sensors:

- **Base Load** — current residual power drawn from the grid
- **Surplus** — surplus power currently being fed into the grid
- **Absolute Grid Flow** — absolute grid power regardless of direction

The number displayed as `lux` in Apple Home represents watts. For example, `742 lux` means `742 W`.

## Requirements

- Homebridge 1.8 or newer
- Node.js 18.20.4 or newer
- Shelly Pro 3EM reachable from the Homebridge host
- Shelly authentication disabled (the current version does not implement Shelly digest authentication)

## Installation

After publishing this folder to GitHub:

```sh
npm install -g git+https://github.com/YOUR-GITHUB-USERNAME/homebridge-shelly-pro3em.git
```

For local testing, copy the folder to the Homebridge machine and run:

```sh
npm install -g /path/to/homebridge-shelly-pro3em
```

Restart Homebridge after installation.

## Configuration

The plugin includes a standard Homebridge Config UI X settings form. Open the plugin settings after installation and enter the device IP without a protocol or path. No manual JSON editing is required.

### Run as its own child bridge

This is a Homebridge dynamic platform plugin and supports the standard child-bridge workflow:

1. Open the plugin in Homebridge UI.
2. Open the plugin's menu and select **Bridge Settings**.
3. Enable **Run in Child Bridge** and save.
4. Restart Homebridge.
5. Pair the new child bridge with Apple Home using the QR code shown by Homebridge.

The three light sensors will then live on their own Shelly Pro 3EM bridge, separately from the main Homebridge bridge.

Manual `config.json` example:

```json
{
  "platform": "ShellyPro3EM",
  "name": "Shelly Pro 3EM",
  "ip": "192.168.0.24",
  "consumptionSensorName": "Shelly Pro 3EM Base Load",
  "surplusSensorName": "Shelly Pro 3EM Surplus",
  "netFlowSensorName": "Shelly Pro 3EM Absolute Grid Flow",
  "invertDirection": false,
  "deadbandWatts": 1,
  "pollIntervalSeconds": 10,
  "requestTimeoutSeconds": 5,
  "logReadings": true
}
```

Run the plugin as a Homebridge child bridge if desired. Pair that child bridge with Apple Home after restarting Homebridge.

## Direction and calculations

By default, the Shelly's `total_act_power` is interpreted as follows:

```text
Base Load         = max(total_act_power, 0)
Surplus           = max(-total_act_power, 0)
Absolute Grid Flow = abs(total_act_power)
```

`Base Load` in this plugin means the residual power currently drawn from the grid. A single meter at the grid connection cannot determine total household consumption while a solar system is generating behind that meter.

If import and export appear reversed, enable `invertDirection`.

HomeKit light sensors cannot represent an exact zero; this plugin sends `0.0001 lux`, which Apple Home normally rounds to zero. HomeKit also limits ambient light values to `100000 lux`, so readings above 100 kW are clamped.

## Logging

`logReadings` is enabled by default. Every successful poll is written to the normal Homebridge log:

```text
[Shelly Pro 3EM] Readings: Base Load=261 W, Surplus=0 W, Absolute Grid Flow=261 W.
```

Disable **Log Every Reading** in the plugin settings to keep only startup and error messages in the normal log. Successful readings remain available in Homebridge debug logging when this option is disabled.

## Development

```sh
npm test
npm run check
npm pack --dry-run
```

## License

MIT
