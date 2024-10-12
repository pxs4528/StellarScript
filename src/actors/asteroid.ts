import * as ex from 'excalibur'
import Config from '../config'
import { explosionSpriteSheet, gameSheet, Images, Sounds } from '../resources'
import { stats } from '../stats'
import { animManager } from './animation-manager'

export class Asteroid extends ex.Actor {
	public static group = ex.CollisionGroupManager.create('asteroid')

	private anim?: ex.Animation
	private explode?: ex.Animation
	constructor(x: number, y: number, width: number, height: number) {
		super({
			pos: new ex.Vector(x, y),
			width: width,
			height: height,
		})

		// Passive receives collision events but does not participate in resolution
		this.body.collisionType = ex.CollisionType.Active
		// Enemy groups does not collide with itself
		this.body.group = Asteroid.group

		// Setup listeners
		this.on('precollision', (evt) => this.onPreCollision(evt))
	}

	// OnInitialize is called before the 1st actor update
	onInitialize(engine: ex.Engine) {
		// Initialize actor

		// Setup visuals
		this.anim = ex.Animation.fromSpriteSheet(
			gameSheet,
			[10, 11, 12],
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
		this.actions.repeatForever(ctx =>
			ctx.moveTo(this.pos.x, this.pos.y + 800, Config.enemySpeed)
				.moveTo(this.pos.x + 800, this.pos.y, Config.enemySpeed)
				.moveTo(this.pos.x + 800, this.pos.y + 800, Config.enemySpeed)
				.moveTo(this.pos.x, this.pos.y, Config.enemySpeed)
		)
	}

	// Fires before excalibur collision resolution
	private onPreCollision(evt: ex.PreCollisionEvent) {
		// only kill a baddie if it collides with something that isn't a baddie or a baddie bullet
		if (!(evt.other instanceof Asteroid)) {
			Sounds.explodeSound.play()
			if (this.explode) {
				animManager.play(this.explode, this.pos)
			}
			this.kill()
		}
	}
}
