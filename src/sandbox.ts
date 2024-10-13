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

	onActivate() {
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
		let isLefton = this.gpio[0]
		let isRighton = this.gpio[1]
		let newSprite = ex.Animation.fromSpriteSheet(
			gameSheet,
			[19],
			100,
			ex.AnimationStrategy.Loop,
		)
		const gpio = this.gpio
		Function(`
			'use strict'
			const { write, read } = this
			${this.deployedCode}
			;loop()
		`).bind({
			write(id: number, value: number) {
				gpio[id] = value
				if (id === 0){
					if (value)
						Config.currentStripe = 17;
					else
						Config.currentStripe = 19;
				}
				if (id === 1){
					if (value)
						Config.currentStripe = 18;
					else
						Config.currentStripe = 19;
				}
			},
			read(id: number) {
				return gpio[id]
			},
		})()

		this.ship.vel = ex.vec(0, gpio[0] ? -100 : 0)
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

	onInitialize(engine: ex.Engine) {
		engine.add(animManager)

		const ship = new Ship(engine.halfDrawWidth, 600, 80, 80)
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
