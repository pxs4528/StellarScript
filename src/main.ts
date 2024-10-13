// Main Game Logic
import * as ex from 'excalibur'
import Config from './config'
import { Game } from './game'
import { Images, loader, Sounds } from './resources'
import { Sandbox } from './sandbox'
import './index.css'

const gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement
const rootDiv = document.getElementById('rootDiv') as HTMLDivElement

async function waitForFontLoad(font: string, timeout = 2000, interval = 100) {
	return new Promise((resolve, reject) => {
		// repeatedly poll check
		const poller = setInterval(async () => {
			try {
				await document.fonts.load(font)
			} catch (err) {
				reject(err)
			}
			if (document.fonts.check(font)) {
				clearInterval(poller)
				resolve(true)
			}
		}, interval)
		setTimeout(() => clearInterval(poller), timeout)
	})
}

const engine = new ex.Engine({
	backgroundColor: ex.Color.Black,
	pixelRatio: 2,
	width: 2000,
	height: 1400,
	displayMode: ex.DisplayMode.FitScreen,
	canvasElement: gameCanvas,
})
// engine.debug.entity.showName = true
engine.backgroundColor = ex.Color.Black
engine.setAntialiasing(false)

// Setup game scene

if (!Images.backgroundImage) {
	console.error('Background image not loaded')
} else {
	const backgroundSprite = Images.backgroundImage.toSprite()
	backgroundSprite.destSize.width = engine.screen.resolution.width
	backgroundSprite.destSize.height = engine.screen.resolution.height

	// Create an actor for the background
	const backgroundActor = new ex.Actor({
		x: engine.screen.resolution.width / 2,
		y: engine.screen.resolution.height / 2,
		width: engine.screen.resolution.width,
		height: engine.screen.resolution.height,
	})
	backgroundActor.z = -99
	backgroundActor.graphics.anchor = ex.Vector.Zero
	backgroundActor.graphics.use(backgroundSprite)

	// Add the background actor to the engine
	engine.add(backgroundActor)
}
engine.add('game', new Game())
engine.add('sandbox', new Sandbox())
engine.goToScene('sandbox')

// Game events to handle
engine.on('hidden', () => {
	console.log('pause')
	engine.stop()
})
engine.on('visible', () => {
	console.log('start')
	engine.start()
})

engine.input.keyboard.on('press', (evt: ex.Input.KeyEvent) => {
	// if (evt.key === ex.Input.Keys.D) {
	// 	engine.toggleDebug()
	// }
})

waitForFontLoad('normal 30px Open Sans').then(() => {
	engine.start(loader).then(() => {
		Sounds.laserSound.volume = Config.soundVolume
		Sounds.explodeSound.volume = Config.soundVolume
		Sounds.enemyFireSound.volume = Config.soundVolume
		Sounds.powerUp.volume = Config.soundVolume
		Sounds.rocketSound.volume = Config.soundVolume

		console.log('Game Resources Loaded')
	})
})

function syncUiSize() {
	rootDiv.style.top = `${gameCanvas.offsetTop}px`
	rootDiv.style.left = `${gameCanvas.offsetLeft}px`
	rootDiv.style.width = `${gameCanvas.offsetWidth}px`
	rootDiv.style.height = `${gameCanvas.offsetHeight}px`
}
syncUiSize()

window.addEventListener('resize', () => {
	syncUiSize()
})
