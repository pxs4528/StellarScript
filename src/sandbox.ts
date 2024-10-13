import ace from 'ace-builds'
import * as ex from 'excalibur'
import { animManager } from './actors/animation-manager'
import { Asteroid } from './actors/asteroid'
import { Console } from './actors/console'
import { Ship } from './actors/ship'
import Config from './config'
import { gameSheet, Images } from './resources'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement

export class Sandbox extends ex.Scene {
	random = new ex.Random(1337) // seeded random

	deployedCode = `function loop() {
	// gpio[0]
	
}`
	sinceLastSimulationMs = 0
	gpio = [0]
	ship!: Ship

	constructor() {
		super()
	}

	onActivate(context: ex.SceneActivationContext) {
		// Create the code editor HTML setup when sandbox scene is activated
		rootDiv.innerHTML = `
			<section id="sandbox-editor">
				<div id="editor">${this.deployedCode}</div>
				<footer>
					<button id="sandbox-pause">Pause</button>
					<button id="sandbox-deploy">Deploy</button>
				</footer>
			</section>
		`
		const editor = ace.edit('editor')
		editor.setTheme('ace/theme/tomorrow_night')
		editor.session.setMode('ace/mode/javascript')

		const pauseButton = document.getElementById('sandbox-pause') as HTMLButtonElement
		const deployButton = document.getElementById('sandbox-deploy') as HTMLButtonElement
		pauseButton.addEventListener('click', () => {
			if (pauseButton.innerText === 'Pause') {
				context.engine.stop()
				pauseButton.innerText = 'Play'
			} else {
				context.engine.start()
				pauseButton.innerText = 'Pause'
			}
		})
		deployButton.addEventListener('click', () => {
			const code = editor.getValue()
			this.deployedCode = code
		})
	}

	onDeactivate() {
		rootDiv.innerHTML = ''
	}

	onPreUpdate(_engine: ex.Engine, delta: number): void {
		this.sinceLastSimulationMs += delta
		if (this.sinceLastSimulationMs >= 500) {
			this.sinceLastSimulationMs = 0
			this.simulate()
		}
	}

	private simulate() {
		const gpio = this.gpio
		Function(`
			'use strict'
			const { write, read } = this
			${this.deployedCode}
			;loop()
		`).bind({
			write(id: number, value: number) {
				gpio[id] = value
			},
			read(id: number) {
				return gpio[id]
			},
		})()

		this.ship.isLeftEngineOn = Boolean(gpio[0])
		this.ship.isRightEngineOn = Boolean(gpio[1])
		this.ship.vel = ex.vec(0, gpio[0] ? -100 : 0)
	}

	onInitialize(engine: ex.Engine) {
		engine.add(animManager)

		const ship = new Ship(engine.halfDrawWidth, 500, 80, 80)
		engine.add(ship)
		this.ship = ship

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
