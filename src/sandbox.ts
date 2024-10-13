import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/theme-github_dark'
import ace from 'ace-builds'
import * as ex from 'excalibur'
import { animManager } from './actors/animation-manager'
import { Asteroid } from './actors/asteroid'
import { Ship } from './actors/ship'
import Config from './config'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement

const TICK_MS = 50
const ENGINE_LEFT = 0
const ENGINE_RIGHT = 1
const SENSOR_LEFT = 10
const SENSOR_RIGHT = 11

export class Sandbox extends ex.Scene {
	random = new ex.Random(1337) // seeded random

	deployedCode = `const ENGINE_LEFT = ${ENGINE_LEFT};
const ENGINE_RIGHT = ${ENGINE_RIGHT};
const SENSOR_LEFT = ${SENSOR_LEFT}
const SENSOR_RIGHT = ${SENSOR_RIGHT}
const LOW = 0;
const HIGH = 1;

// This function is called every cycle forever.
function loop() {

}`
	isSimulating = false
	sinceLastSimulationMs = 0
	ship!: Ship
	globals: Record<string, any> = {}

	constructor() {
		super()
	}

	onActivate(context: ex.SceneActivationContext) {
		// Create the code editor HTML setup when sandbox scene is activated
		rootDiv.innerHTML = `
			<section id="sandbox-editor">
				<button id="sandbox-collapse">Collapse</button>
				<button id="sandbox-fullscreen">Full Screen</button>
				<div id="editor">${this.deployedCode}</div>
				<footer>
					<button id="sandbox-pause">Pause</button>
					<button id="sandbox-deploy">Deploy</button>
					<button id="sandbox-reset">Reset</button>
				</footer>
			</section>
		`
		const editor = ace.edit('editor', { useWorker: false })
		editor.setTheme('ace/theme/github_dark')
		editor.session.setMode('ace/mode/javascript')

		const pauseButton = document.getElementById('sandbox-pause') as HTMLButtonElement
		const deployButton = document.getElementById('sandbox-deploy') as HTMLButtonElement
		const collapseButton = document.getElementById('sandbox-collapse') as HTMLButtonElement
		const sandboxEditor = document.getElementById('editor') as HTMLDivElement
		const fullscreenButton = document.getElementById('sandbox-fullscreen') as HTMLButtonElement

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
		collapseButton.addEventListener('click', () => {
			if (sandboxEditor.style.display === 'none') {
				sandboxEditor.style.display = 'block'
				fullscreenButton.style.display = 'inline-block'
				collapseButton.innerText = 'Collapse'
			} else {
				sandboxEditor.style.display = 'none'
				fullscreenButton.style.display = 'none'
				collapseButton.innerText = 'Expand'
			}
		})
		fullscreenButton.addEventListener('click', () => {
			if (sandboxEditor.style.height === '70vh') {
				sandboxEditor.style.height = '20vh'
				fullscreenButton.innerText = 'Full Screen'
			} else {
				sandboxEditor.style.height = '70vh'
				fullscreenButton.innerText = 'Exit Full'
			}
		})
	}

	onDeactivate() {
		rootDiv.innerHTML = ''
	}

	onPreUpdate(_engine: ex.Engine, delta: number): void {
		this.sinceLastSimulationMs += delta
		if (this.isSimulating) {
			this.sinceLastSimulationMs = 0
		}
		if (this.sinceLastSimulationMs >= TICK_MS) {
			this.sinceLastSimulationMs = 0
			this.simulate()
		}
	}

	private async simulate() {
		const globals = this.globals
		try {
			this.isSimulating = true
			await Function(`
				'use strict'
				const { delay, g_has, g_get, g_set, read, write } = this
				${
				this.deployedCode
					.replace('function loop()', 'async function loop()')
					.replace(/\bdelay\s*\(\s*(\d+)\s*\)/g, `await delay($1 * ${TICK_MS})`)
			}
				;return loop()
			`).bind({
				delay(ms: number) {
					return new Promise((resolve) => setTimeout(resolve, ms))
				},
				g_has(name: string) {
					return name in globals
				},
				g_get(name: string) {
					return globals[name]
				},
				g_set(name: string, value: any) {
					globals[name] = value
				},
				read: (id: number) => {
					switch (id) {
						case ENGINE_LEFT:
							return Number(this.ship.isLeftEngineOn)
						case ENGINE_RIGHT:
							return Number(this.ship.isRightEngineOn)
						case SENSOR_LEFT:
							return Number(this.ship.isLeftSensorTriggered)
						case SENSOR_RIGHT:
							return Number(this.ship.isRightSensorTriggered)
						default:
							return 0
					}
				},
				write: (id: number, value: number) => {
					switch (id) {
						case ENGINE_LEFT:
							this.ship.isLeftEngineOn = Boolean(value)
							break
						case ENGINE_RIGHT:
							this.ship.isRightEngineOn = Boolean(value)
							break
						case SENSOR_LEFT:
						case SENSOR_RIGHT:
						default:
							break
					}
				},
			})()
		} catch (e) {
			alert(e)
		} finally {
			this.isSimulating = false
		}
	}

	onInitialize(engine: ex.Engine) {
		engine.add(animManager)

		const ship = new Ship(engine.halfDrawWidth, 900, 80, 80)
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
