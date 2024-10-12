import * as ex from 'excalibur'
import { animManager } from './actors/animation-manager'
import { Console } from './actors/console'
import { Ship } from './actors/ship'
import Config from './config'

export class Sandbox extends ex.Scene {
	constructor() {
		super()
	}

	onInitialize(engine: ex.Engine) {
		engine.add(animManager)

		const ship = new Ship(engine.halfDrawWidth, 800, 80, 80)
		engine.add(ship)
	}
}
