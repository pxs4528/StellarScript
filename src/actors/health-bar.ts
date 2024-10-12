import * as ex from 'excalibur'
import { Vector } from 'excalibur'
import Config from '../config'
import { stats } from '../stats'

export class HealthBar extends ex.Actor {
	healthBarWidth = Config.healthBarWidth
	healthBarHeight = Config.healthBarHeight
	constructor() {
		super({
			name: 'healthbar',
			color: ex.Color.Red,
			pos: new ex.Vector(20, 700),
		})

		this.transform.coordPlane = ex.CoordPlane.Screen
		this.body.collisionType = ex.CollisionType.PreventCollision
		this.graphics.anchor = Vector.Zero
		this.graphics.use(
			new ex.Canvas({
				draw: (ctx) => this.draw(ctx),
				cache: false,
				width: 100,
				height: 100,
			}),
		)
	}

	onPreUpdate() {
		this.healthBarWidth = Config.healthBarWidth * (stats.hp / Config.totalHp)
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.clearRect(0, 0, 100, 100)

		// Draw circle shape
		ctx.strokeStyle = this.color.toString()
		ctx.fillStyle = this.color.toString()
		ctx.lineWidth = 3

		// Draw the circle outline
		const radius = 40
		const centerX = 50
		const centerY = 50
		ctx.beginPath()
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
		ctx.closePath()
		ctx.stroke()

		// Fill the circle based on health
		const fillAngle = 2 * Math.PI * (stats.hp / Config.totalHp)
		ctx.beginPath()
		ctx.moveTo(centerX, centerY)
		ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + fillAngle)
		ctx.lineTo(centerX, centerY)
		ctx.closePath()
		ctx.fill()

		// Draw HP text
		ctx.font = 'normal 30px Open Sans'
		ctx.fillText('', 0, 30)
	}
}
