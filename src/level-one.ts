import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/theme-github_dark'
import ace from 'ace-builds'
import * as ex from 'excalibur'
import { animManager } from './actors/animation-manager'
import { Asteroid } from './actors/asteroid'
import { Background } from './actors/background'
import { Ship } from './actors/ship'
import Config from './config'
import { Images } from './resources'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement

const TICK_MS = 100
const ENGINE_LEFT = 0
const ENGINE_RIGHT = 1
const SENSOR_LEFT = 10
const SENSOR_RIGHT = 11

export class LevelOne extends ex.Scene {
	random = new ex.Random(1337) // seeded random

	deployedCode = `const ENGINE_LEFT = ${ENGINE_LEFT};
const ENGINE_RIGHT = ${ENGINE_RIGHT};
const SENSOR_LEFT = ${SENSOR_LEFT};
const SENSOR_RIGHT = ${SENSOR_RIGHT};
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
		rootDiv.innerHTML = `
			<section id="sandbox-editor">
				<button id="sandbox-collapse">Collapse</button>
				<button id="sandbox-fullscreen">Full Screen</button>
				<button id="switch">Output</button>
				<div id="editor">${this.deployedCode}</div>
				<textarea id="output" readonly style="display: none"></textarea>
				<footer>
					<button id="sandbox-deploy">Deploy</button>
					<button id="sandbox-back">Back</button>
				</footer>
			</section>
		`
		const editor = ace.edit('editor', { useWorker: false })
		editor.setTheme('ace/theme/github_dark')
		editor.session.setMode('ace/mode/javascript')

		const deployButton = document.getElementById('sandbox-deploy') as HTMLButtonElement
		const collapseButton = document.getElementById('sandbox-collapse') as HTMLButtonElement
		const sandboxEditor = document.getElementById('editor') as HTMLDivElement
		const fullscreenButton = document.getElementById('sandbox-fullscreen') as HTMLButtonElement
		const switchButton = document.getElementById('switch') as HTMLButtonElement
		const output = document.getElementById('output') as HTMLTextAreaElement
		const backButton = document.getElementById('sandbox-back') as HTMLButtonElement

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
		switchButton.addEventListener('click', () => {
			if (sandboxEditor.style.display === 'none') {
				sandboxEditor.style.display = 'block'
				output.style.display = 'none'
				switchButton.innerText = 'Output'
				fullscreenButton.style.display = 'inline-block'
				collapseButton.style.display = 'inline-block'
			} else {
				sandboxEditor.style.display = 'none'
				output.style.display = 'block'
				switchButton.innerText = 'Editor'
				fullscreenButton.style.display = 'none'
				collapseButton.style.display = 'none'
			}
		})
		backButton.addEventListener('click', () => {
			context.engine.goToScene('mainMenu')
		})
	}

	onDeactivate() {
		rootDiv.innerHTML = ''
	}

	onPreUpdate(engine: ex.Engine, delta: number): void {
		this.sinceLastSimulationMs += delta
		if (this.isSimulating) {
			this.sinceLastSimulationMs = 0
		}
		if (this.sinceLastSimulationMs >= TICK_MS) {
			this.sinceLastSimulationMs = 0
			this.simulate(engine)
		}
	}

	onPostUpdate(_engine: ex.Engine, _delta: number): void {
		this.camera.pos = this.ship.pos
	}

	private async simulate(engine: ex.Engine) {
		const globals = this.globals
		try {
			this.isSimulating = true
			await Function(`
				'use strict'
				const { delay, g_has, g_get, g_set, print, read, write } = this
				${
				this.deployedCode
					.replace('function loop()', 'async function loop()')
					.replace(/\bdelay\s*\(\s*(\d+)\s*\)/g, `await delay($1 * ${TICK_MS})`)
			}
				;return loop()
			`).bind({
				delay(ms: number) {
					return new Promise<void>((resolve) => engine.clock.schedule(resolve, ms))
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
				print: (...args: any[]) => {
					this.showInOutput(args.join(' '))
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
			this.showInOutput(`${e}`)
		} finally {
			this.isSimulating = false
		}
	}

	private showInOutput(messsage: string) {
		const output = document.getElementById('output') as HTMLTextAreaElement
		const currentTime = new Date().toLocaleTimeString()
		output.textContent += `[${currentTime}] ` + messsage + '\n'
		output.scrollTop = output.scrollHeight
	}

	onInitialize(engine: ex.Engine) {
		engine.add(animManager)

		const tileMap = new ex.TileMap({
			rows: 128,
			columns: 128,
			tileWidth: Config.backgroundTileSize,
			tileHeight: Config.backgroundTileSize,
		})
		tileMap.pos = ex.vec(-64 * Config.backgroundTileSize, -64 * Config.backgroundTileSize)
		const sprite = Images.stars.toSprite()
		sprite.destSize.width = Config.backgroundTileSize
		sprite.destSize.height = Config.backgroundTileSize
		for (const tile of tileMap.tiles) {
			tile.addGraphic(sprite)
		}
		this.add(tileMap)

		const ship = new Ship(engine.halfDrawWidth, 900, 80, 80)
		engine.add(ship)
		this.ship = ship
	}
}
