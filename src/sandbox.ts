import * as ex from 'excalibur'
import { animManager } from './actors/animation-manager'
import { Asteroid } from './actors/asteroid'
import { Console } from './actors/console'
import { Ship } from './actors/ship'
import Config from './config'

export class Sandbox extends ex.Scene {
	random = new ex.Random(1337) // seeded random

	constructor() {
		super()
	}

	onInitialize(engine: ex.Engine) {
		engine.add(animManager)

		const ship = new Ship(engine.halfDrawWidth, 800, 80, 80)
		engine.add(ship)

		let asteroidTimer = new ex.Timer({
			fcn: () => {
				var asteroid = new Asteroid(
					this.random.floating(this.camera.viewport.left, this.camera.viewport.right),
					-100,
					80,
					80,
				)
				engine.add(asteroid)
			},
			interval: Config.spawnTime,
			repeats: true,
			numberOfRepeats: -1,
		})

		engine.addTimer(asteroidTimer)
		asteroidTimer.start()
	}
}
