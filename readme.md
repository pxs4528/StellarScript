# Stellar Script

Play now [here](https://stellarscript.study/)


https://github.com/user-attachments/assets/ba8170c5-1d7d-463d-a49d-1d315098f631


### StellarScript Global Function References

* `delay(milliseconds: number): void`: delay the execution by milliseconds.
* `g_has(name: string): boolean`: check if a global variable named `name` exists.
* `g_get(name: string): any`: get the value of the global variable named `name`.
* `g_set(name: string, value: any): void`: set the value of the global variable named `name` to `value`. Global variables persist through different executions of the `loop()` function.
* `print(...args: any[]): void`: print the provided values in the "Output" tab.
* `read(pin: number)`: read a value from the device at the specific GPIO pin. All device pins can be found in constants defined at the top of the code.
* `write(pin: number, value: number)`: write a value to the device at the specific GPIO pin. All device pins can be found in constants defined at the top of the code.


## Try it Out

The game is deployed at [https://stellarscript.study](https://stellarscript.study). Only "Sandbox" mode is implemented at the time of writing this post.

This is some sample code you can copy paste to understand how certain functions work
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
   * [Webpack dev server](https://webpack.js.org/configuration/dev-server/) will host the script in a little server on http://localhost:8082/

## Building bundles

* Run `npm run build:dev` to produce javascript bundles for debugging in the `dist/` folder
* Run `npm run build:prod` to produce javascript bundles for production (minified) in the `dist/` folder

## ACKs
* [Code editor](https://github.com/ajaxorg/ace)
* [Game engine](https://excaliburjs.com/)
* [Spaceship assets](https://axassets.itch.io/spaceship-simple-assets)
