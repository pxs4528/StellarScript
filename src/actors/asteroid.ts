import * as ex from 'excalibur'
import Config from '../config'
import { explosionSpriteSheet, gameSheet, Images, Sounds } from '../resources'
import { Sandbox } from '../sandbox'
import { stats } from '../stats'
import { animManager } from './animation-manager'
import { Console } from './console'

export class Asteroid extends ex.Actor {
	public static group = ex.CollisionGroupManager.create('asteroid')

	private anim?: ex.Animation
	private explode?: ex.Animation

	isExploding = false

	constructor(x: number, y: number, width: number, height: number) {
		super({
			pos: new ex.Vector(x, y),
			width: width,
			height: height,
		})

		// Passive receives collision events but does not participate in resolution
		this.body.collisionType = ex.CollisionType.Passive
		// Enemy groups does not collide with itself
		// this.body.group = Asteroid.group
	}

	// OnInitialize is called before the 1st actor update
	onInitialize(engine: ex.Engine) {
		// Initialize actor
		this.graphics.onPostDraw = this.onPostDraw.bind(this)
		this.on('precollision', (evt) => this.onPreCollision(evt))

		// Setup visuals
		this.anim = ex.Animation.fromSpriteSheet(
			gameSheet,
			[23],
			100,
			ex.AnimationStrategy.Loop,
		)
		this.anim.scale = new ex.Vector(4, 4)
		this.graphics.use(this.anim)

		this.explode = ex.Animation.fromSpriteSheet(
			explosionSpriteSheet,
			ex.range(0, explosionSpriteSheet.sprites.length - 1),
			40,
			ex.AnimationStrategy.End,
		)
		this.explode.scale = new ex.Vector(3, 3)

		// Setup patrolling behavior
		const angle = Math.random() * Math.PI * 2
		const multiplier = Math.random() * 2
		this.vel = new ex.Vector(
			Math.cos(angle) * Config.enemySpeed * multiplier,
			Math.sin(angle) * Config.enemySpeed * multiplier,
		)
		// this.actions.repeatForever(ctx =>
		// 	ctx.moveTo(this.pos.x, this.pos.y + 800, Config.enemySpeed)
		// 		.moveTo(this.pos.x + 800, this.pos.y, Config.enemySpeed)
		// 		.moveTo(this.pos.x + 800, this.pos.y + 800, Config.enemySpeed)
		// 		.moveTo(this.pos.x, this.pos.y, Config.enemySpeed)
		// )
	}
	onPostUpdate(engine: ex.Engine, delta: number) {
		// Keep asteroid within game bounds
		// if (this.pos.x < 0 || this.pos.x > engine.drawWidth) {
		// this.vel.x *= -1
		// }
		// if (this.pos.y < 0 || this.pos.y > engine.drawHeight) {
		// this.vel.y *= -1
		// }
		if (this.isExploding) {
			this.vel = ex.Vector.Zero
			this.body.collisionType = ex.CollisionType.PreventCollision
		}
	}

	private onPreCollision(evt: ex.PreCollisionEvent) {
		// if (evt.other instanceof Asteroid) {
		// 	// Asteroid-to-asteroid collision
		// 	this.reverseDirection()
		// 	evt.other.reverseDirection() // Reverse the direction of the other asteroid
		// } else {
		// Collision with non-asteroid object
		if (!this.isExploding) {
			Sounds.explodeSound.play()
			this.isExploding = true
		}
		// }
	}
	private reverseDirection() {
		// Get current velocity
		const currentVel = this.vel

		// Reverse the velocity
		this.vel = currentVel.negate()

		// Optionally, add a small random offset to avoid asteroids getting stuck
		// const randomOffset = new ex.Vector(
		// 	(Math.random() - 0.5) * 20,
		// 	(Math.random() - 0.5) * 20,
		// )
		// this.vel = this.vel.add(randomOffset)
	}

	onPostDraw() {
		if (this.isExploding && this.explode) {
			this.graphics.use(this.explode)
			if (this.explode.done) {
				this.kill()
			}
		}
	}
}
