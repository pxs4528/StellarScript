import * as ex from 'excalibur'
import Config from './config'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement
export class Levels extends ex.Scene {
	constructor() {
		super()
	}

	onActivate(context: ex.SceneActivationContext) {
		rootDiv.innerHTML = `
         <section id="main-menu">
            <div class="container">
            <div class="gap">
               <div>
                   <h1 id="h1-SS">StellarScript</h1>
                   <div class="gap">
                       <button id="level-one">Level 1</button>
                       <button id="level-two">Level Two</button>
                   </div>
               </div>
            </div>
         </section>
        `
		const levelOne = document.getElementById('level-one') as HTMLButtonElement
		levelOne.onclick = () => {
			context.engine.goToScene('level-one')
		}

		const levelTwo = document.getElementById('level-two') as HTMLButtonElement
	}

	onDeactivate(_context: ex.SceneActivationContext): void {
		rootDiv.innerHTML = ''
	}
}
