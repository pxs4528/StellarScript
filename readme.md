# stellr.dev

A roguelike where you program the ship instead of steering it. Play now [here](https://stellr.dev/)


https://github.com/user-attachments/assets/ba8170c5-1d7d-463d-a49d-1d315098f631


## A run

Pick **New Run** on the menu. A run is a chain of star systems, and each system has three encounters: an asteroid field, an enemy patrol, and a boss with a rule that breaks your script.

* **Hangar.** Between encounters you edit your script and spend credits. You cannot edit code once you launch.
* **Salvage.** Each encounter has a salvage target. Asteroids are worth 10, drones 25 and the boss 80, times your multiplier. Clear the target before the hull or the fuel runs out. Ramming things destroys them but earns nothing.
* **Jokers.** Up to five. Most reward how you code: Code Golf, Pure Function, Rubber Duck, Off By One, Technical Debt, Race Condition, Garbage Collector, Hot Path.
* **Hardware.** Upgrade levels for sensors, cannon, thrusters, gyros and clock speed. Rarer parts add new pins: a radar and a shield.

In a run the pin names are already defined, so a script is just `loop()`.

| Pin | Use |
| --- | --- |
| `ENGINE_LEFT`, `ENGINE_RIGHT` | `write` HIGH or LOW. One engine turns the ship, both fly straight. |
| `SENSOR_LEFT`, `SENSOR_RIGHT` | `read` 1 when something is ahead on that side. |
| `WEAPON` | `write` HIGH to fire. |
| `RADAR_BEARING`, `RADAR_DISTANCE` | Needs the radar. Degrees to the nearest contact (negative is left) and its distance, or -1. |
| `SHIELD` | Needs the shield. `write` HIGH to block damage while burning extra fuel. |

All art added for run mode is placeholder, see `res/placeholder/README.md`.

### Global Function References

* `delay(ticks: number): void`: pause the script for that many ticks (a tick is 100 ms before upgrades).
* `g_has(name: string): boolean`: check if a global variable named `name` exists.
* `g_get(name: string): any`: get the value of the global variable named `name`.
* `g_set(name: string, value: any): void`: set the value of the global variable named `name` to `value`. Global variables persist through different executions of the `loop()` function.
* `print(...args: any[]): void`: print the provided values in the "Output" tab.
* `read(pin: number)`: read a value from the device at the specific GPIO pin. All device pins can be found in constants defined at the top of the code.
* `write(pin: number, value: number)`: write a value to the device at the specific GPIO pin. All device pins can be found in constants defined at the top of the code.


## Try it Out

The game is deployed at [https://stellr.dev](https://stellr.dev).

This is some sample code you can copy paste into Sandbox mode to understand how certain functions work
```javascript
const ENGINE_LEFT = 0;
const ENGINE_RIGHT = 1;
const SENSOR_LEFT = 2;
const SENSOR_RIGHT = 3;
const WEAPON = 4;
const LOW = 0;
const HIGH = 1;

// This function is called every cycle forever.
function loop() {
  // Read sensor values
  const leftSensorValue = read(SENSOR_LEFT);
  const rightSensorValue = read(SENSOR_RIGHT);

  // Determine if an asteroid is detected
  const isAsteroidDetected = leftSensorValue === 1 || rightSensorValue === 1;

  // If an asteroid is detected, turn the appropriate engine on and shoot a bullet
  if (isAsteroidDetected) {
    if (leftSensorValue === 1) {
      // Asteroid is on the left side, turn left engine on and shoot a bullet
      write(ENGINE_LEFT, HIGH);
      write(ENGINE_RIGHT, LOW);
      write(WEAPON, HIGH);
    } else {
      // Asteroid is on the right side, turn right engine on and shoot a bullet
      write(ENGINE_RIGHT, HIGH);
      write(ENGINE_LEFT, LOW);
      write(WEAPON, HIGH);
    }
  } else {
    // No asteroid detected, move forward by turning both engines on
    write(ENGINE_LEFT, HIGH);
    write(ENGINE_RIGHT, HIGH);
  }
}
```


## Running locally

* Using [nodejs](https://nodejs.org/en/) and [npm](https://www.npmjs.com/)
* Run the `npm install` to install dependencies
* Run the `npm run dev` to run the development server to test out changes
   * [Webpack](https://webpack.js.org/) will build the [typescript](https://www.typescriptlang.org/) into javascript
   * [Webpack dev server](https://webpack.js.org/configuration/dev-server/) will host the script in a little server on http://localhost:9000/

## Building bundles

* Run `npm run build:dev` to produce javascript bundles for debugging in the `dist/` folder
* Run `npm run build:prod` to produce javascript bundles for production (minified) in the `dist/` folder

## ACKs
* [Code editor](https://github.com/ajaxorg/ace)
* [Game engine](https://excaliburjs.com/)
* [Spaceship assets](https://axassets.itch.io/spaceship-simple-assets)
