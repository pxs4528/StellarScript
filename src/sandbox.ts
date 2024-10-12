import * as ex from 'excalibur'
import { animManager } from './actors/animation-manager'
import { Asteroid } from './actors/asteroid'
import { Console } from './actors/console'
import { Ship } from './actors/ship'
import Config from './config'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement

export class Sandbox extends ex.Scene {
	random = new ex.Random(1337) // seeded random

	constructor() {
		super()
	}

	onActivate() {
		// Create the code editor HTML setup when sandbox scene is activated
		rootDiv.innerHTML = `
			<section id="sandbox-editor">
				<textarea>function onUpdate(gpio, context) {
	// gpio[0] is engine
	
}</textarea>
				<footer>
					<button id="sandbox-pause">Pause</button>
					<button id="sandbox-deploy">Deploy</button>
				</footer>
			</section>
		`
		const pauseButton = document.getElementById('sandbox-pause') as HTMLButtonElement
		const deployButton = document.getElementById('sandbox-deploy') as HTMLButtonElement
		deployButton.addEventListener('click', this.onDeploy.bind(this))
	}

	onDeactivate() {
		rootDiv.innerHTML = ''
	}

	onDeploy() {
		const editor = document.querySelector('#sandbox-editor>textarea') as HTMLTextAreaElement
		const code = editor.value + `;onUpdate()`
		const func = new Function(code)
		func()
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
