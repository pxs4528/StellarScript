import * as ex from 'excalibur'
import Config from './config'
import { Levels } from './levels'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement
export class MainMenu extends ex.Scene {
	constructor() {
		super()
	}

	onActivate(context: ex.SceneActivationContext) {
		rootDiv.innerHTML = `
            <section id="main-menu" class="w-full flex flex-row gap-4">
                <h1 id="h1-SS">StellarScript</h1>
                <button id="level-select" class="button blue">Levels</button>
                <button id="sandbox-button" class="button blue">Sandbox</button>
                <div class="flex flex-row gap-4 justify-stretch w-60">
                    <button id="go-fullscreen" class="button yellow">Fullscreen</button>
                    <button id="toggle-physics" class="button yellow">Physics: simple</button>
                </div>
            </section>
        `
		const sandboxButton = document.getElementById('sandbox-button') as HTMLButtonElement
		sandboxButton.onclick = () => {
			this.engine.goToScene('sandbox')
		}
		const goFullscreenButton = document.getElementById('go-fullscreen') as HTMLButtonElement

		goFullscreenButton.addEventListener('click', () => {
			if (document.fullscreenElement) {
				document.exitFullscreen()
			} else {
				document.documentElement.requestFullscreen()
			}
		})

		const togglePhysicsButton = document.getElementById('toggle-physics') as HTMLButtonElement
		togglePhysicsButton.onclick = () => {
			Config.physicsMode = Config.physicsMode === 'simple' ? 'advanced' : 'simple'
			togglePhysicsButton.innerText = `Physics: ${Config.physicsMode}`
		}

		const levelSelectButton = document.getElementById('level-select') as HTMLButtonElement

		levelSelectButton.onclick = () => {
			context.engine.goToScene('levels')
		}
	}

	onDeactivate(_context: ex.SceneActivationContext): void {
		rootDiv.innerHTML = ''
	}
}
