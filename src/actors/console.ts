import * as ex from 'excalibur'
import { Vector } from 'excalibur'
import Config from '../config'
import { stats } from '../stats'

export class Console extends ex.Actor {
	private cursorVisible: boolean = true
	private cursorTimer: ex.Timer = new ex.Timer({
		interval: 500,
		fcn: () => {
			this.cursorVisible = !this.cursorVisible
		},
		repeats: true,
	})

	ConsoleWidth = Config.consoleWidth
	ConsoleHeight = Config.consoleHeight
	currentCommand: string = ''

	constructor() {
		super({
			name: 'console',
			color: ex.Color.DarkGray,
			pos: new ex.Vector(
				(window.innerWidth - Config.consoleWidth) / 3, // Center horizontally
				window.innerHeight - Config.consoleHeight - 70, // Near the bottom
			),
		})

		this.transform.coordPlane = ex.CoordPlane.Screen
		this.body.collisionType = ex.CollisionType.Active
		this.graphics.anchor = Vector.Zero
		this.graphics.use(
			new ex.Canvas({
				draw: (ctx) => this.draw(ctx),
				cache: false,
				width: Config.consoleWidth + 20,
				height: Config.consoleHeight + 50,
			}),
		)

		// Add event listener for keypress
		window.addEventListener('keydown', (event) => this.handleKeyPress(event))
	}

	handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			this.executeCommand(this.currentCommand)
			this.currentCommand = ''
		} else if (event.key === 'Backspace') {
			this.currentCommand = this.currentCommand.slice(0, -1)
		} else {
			this.currentCommand += event.key
		}
	}

	executeCommand(command: string) {
		// Placeholder for command execution logic
		console.log(`Executing command: ${command}`)
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.strokeStyle = this.color.toString()
		ctx.fillStyle = this.color.toString()
		ctx.lineWidth = 3
		ctx.font = 'italic 20px Open Sans'
		ctx.fillText('command console', 0, 30)
		ctx.strokeRect(0, 35, Config.consoleWidth + 10, Config.consoleHeight + 10)
		ctx.fillRect(5, 40, this.ConsoleWidth, Config.consoleHeight)

		// Draw the current command input
		ctx.fillText(this.currentCommand, 10, Config.consoleHeight + 50)

		if (this.cursorVisible) {
			ctx.fillRect(
				10 + ctx.measureText(this.currentCommand).width,
				Config.consoleHeight + 40,
				10,
				20,
			)
		}
	}
}
