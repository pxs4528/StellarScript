import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/theme-github_dark'
import ace from 'ace-builds'
import * as ex from 'excalibur'
import { Asteroid } from './actors/asteroid'
import { Ship } from './actors/ship'
import Config from './config'
import { Images } from './resources'
import { Pins, ScriptRunner } from './script-runner'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement

const { ENGINE_LEFT, ENGINE_RIGHT, SENSOR_LEFT, SENSOR_RIGHT, WEAPON } = Pins

export class Sandbox extends ex.Scene {
	random = new ex.Random(1337) // seeded random

	deployedCode = `const ENGINE_LEFT = ${ENGINE_LEFT};
const ENGINE_RIGHT = ${ENGINE_RIGHT};
const SENSOR_LEFT = ${SENSOR_LEFT};
const SENSOR_RIGHT = ${SENSOR_RIGHT};
const WEAPON = ${WEAPON};
const LOW = 0;
const HIGH = 1;

// This function is called every cycle forever.
function loop() {

}`
	ship!: Ship
	runner = new ScriptRunner({
		read: (id) => {
			switch (id) {
				case ENGINE_LEFT:
					return Number(this.ship.isLeftEngineOn)
				case ENGINE_RIGHT:
					return Number(this.ship.isRightEngineOn)
				case SENSOR_LEFT:
					return Number(this.ship.isLeftSensorTriggered)
				case SENSOR_RIGHT:
					return Number(this.ship.isRightSensorTriggered)
				case WEAPON:
				default:
					return 0
			}
		},
		write: (id, value) => {
			switch (id) {
				case ENGINE_LEFT:
					this.ship.isLeftEngineOn = Boolean(value)
					break
				case ENGINE_RIGHT:
					this.ship.isRightEngineOn = Boolean(value)
					break
				case WEAPON:
					this.ship.shouldFireBullet = Boolean(value)
					break
				case SENSOR_LEFT:
				case SENSOR_RIGHT:
				default:
					break
			}
		},
		print: (message) => this.showInOutput(message),
	})

	constructor() {
		super()
	}

	onActivate(context: ex.SceneActivationContext) {
		// Create the code editor HTML setup when sandbox scene is activated
		rootDiv.innerHTML = `
			<section id="sandbox-editor">
				<button id="sandbox-collapse">Collapse</button>
				<button id="sandbox-fullscreen">Full Screen</button>
				<button id="switch">Output</button>
				<div id="editor"></div>
				<textarea id="output" readonly style="display: none"></textarea>
				<footer>
					<button id="sandbox-pause">Pause</button>
					<button id="sandbox-deploy">Deploy</button>
					<button id="sandbox-back">Back</button>
				</footer>
			</section>
		`
		const editor = ace.edit('editor', { useWorker: false })
		editor.setTheme('ace/theme/github_dark')
		editor.session.setMode('ace/mode/javascript')
		editor.setValue(this.deployedCode, -1)

		const pauseButton = document.getElementById('sandbox-pause') as HTMLButtonElement
		const deployButton = document.getElementById('sandbox-deploy') as HTMLButtonElement
		const collapseButton = document.getElementById('sandbox-collapse') as HTMLButtonElement
		const sandboxEditor = document.getElementById('editor') as HTMLDivElement
		const fullscreenButton = document.getElementById('sandbox-fullscreen') as HTMLButtonElement
		const switchButton = document.getElementById('switch') as HTMLButtonElement
		const output = document.getElementById('output') as HTMLTextAreaElement
		const backButton = document.getElementById('sandbox-back') as HTMLButtonElement

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
			context.engine.goToScene('mainmenu')
		})
	}

	onDeactivate() {
		rootDiv.innerHTML = ''
	}

	onPreUpdate(engine: ex.Engine, delta: number): void {
		this.runner.code = this.deployedCode
		this.runner.update(engine, delta)
	}

	onPostUpdate(engine: ex.Engine, delta: number): void {
		this.camera.pos = this.ship.pos
	}

	private showInOutput(messsage: string) {
		const output = document.getElementById('output') as HTMLTextAreaElement
		const currentTime = new Date().toLocaleTimeString()
		output.textContent += `[${currentTime}] ` + messsage + '\n'
		output.scrollTop = output.scrollHeight
	}

	onInitialize(engine: ex.Engine) {
		const tileMap = new ex.TileMap({
			rows: Config.backgroundTileCount,
			columns: Config.backgroundTileCount,
			tileWidth: Config.backgroundTileSize,
			tileHeight: Config.backgroundTileSize,
		})
		tileMap.pos = ex.vec(
			-Config.backgroundTileCount * Config.backgroundTileSize / 2,
			-Config.backgroundTileCount * Config.backgroundTileSize / 2,
		)
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

		let asteroidTimer = new ex.Timer({
			fcn: () => {
				var asteroid = new Asteroid(
					this.random.floating(
						this.ship.pos.x - Config.enemySpawnRadius,
						this.ship.pos.x + Config.enemySpawnRadius,
					),
					this.random.floating(
						this.ship.pos.y - Config.enemySpawnRadius,
						this.ship.pos.y + Config.enemySpawnRadius,
					),
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
