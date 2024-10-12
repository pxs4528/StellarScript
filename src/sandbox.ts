import * as ex from 'excalibur'
import { animManager } from './actors/animation-manager'
import { Asteroid } from './actors/asteroid'
import { Console } from './actors/console'
import { Ship } from './actors/ship'
import Config from './config'
import { Images } from './resources'
import ace from 'ace-builds'

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
					<div id="editor">function foo(items) {
    				var x = "All this is syntax highlighted";
    				return x;
					}
					</div>
				<script>
					</script>
				<footer>
					<button id="sandbox-pause">Pause</button>
					<button id="sandbox-deploy">Deploy</button>
				</footer>
			</section>
		`
		var editor = ace.edit("editor");
		editor.setTheme("ace/theme/monokai");
		editor.session.setMode("ace/mode/javascript");
		const pauseButton = document.getElementById('sandbox-pause') as HTMLButtonElement
		const deployButton = document.getElementById('sandbox-deploy') as HTMLButtonElement
		deployButton.addEventListener('click', this.onDeploy.bind(this))
	}

	onDeactivate() {
		rootDiv.innerHTML = ''
	}
	onPostUpdate(_engine: ex.Engine, _delta: number): void {
		// if paused stop the engine
		const pauseButton = document.getElementById('sandbox-pause') as HTMLButtonElement
		pauseButton.addEventListener('click', () => {
			if (pauseButton.innerText === 'Pause') {
				_engine.stop()
				pauseButton.innerText = 'Play'
			} else {
				_engine.start()
				pauseButton.innerText = 'Pause'
			}
		})
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
