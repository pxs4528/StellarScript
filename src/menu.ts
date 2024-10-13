import * as ex from 'excalibur'
import Config from './config'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement
export class MainMenu extends ex.Scene {
	constructor() {
		super()
	}

	onActivate() {
		rootDiv.innerHTML = `
            <section id="main-menu">
               <div class="container">
        <div class="gap">
        <div>
            <h1 id="h1-SS">StellarScript</h1>
            <div class="gap">
            <button id="sandbox-button">Sandbox</button>
            <button id="level-select">Level Select</button>
            <div class="final">
              <button id="go-fullscreen">Go Fullscreen</button>
    <button id="toggle-physics">Physics : Simple</button>
            </div>
            </div>
        </div>
    </div>
    <footer>
    </footer>
            </section>
        `
		const sandboxButton = document.getElementById('sandbox-button') as HTMLButtonElement
		sandboxButton.onclick = () => {
			this.engine.goToScene('sandbox')
		}
		const goFullscreenButton = document.getElementById('go-fullscreen') as HTMLButtonElement

		goFullscreenButton.addEventListener('click', () => {
			if (document.documentElement.requestFullscreen) {
				document.documentElement.requestFullscreen()
			}
		})

        const togglePhysicsButton = document.getElementById('toggle-physics') as HTMLButtonElement
        togglePhysicsButton.onclick = () => {
            Config.physicsMode = Config.physicsMode === 'simple' ? 'advanced' : 'simple'
            togglePhysicsButton.innerText = `Physics : ${Config.physicsMode}`
        }
	}

	onDeactivate(_context: ex.SceneActivationContext): void {
		rootDiv.innerHTML = ''
	}
}
