import * as ex from 'excalibur'
import Config from '../config'
import { gameSheet } from '../resources'
import { Baddie } from './baddie'
import { isDamageable } from './combat'

export interface BulletOptions {
	damage?: number
	fromPlayer?: boolean
	// Hull damage dealt to the ship on contact. Leave at 0 for the ship's own bullets.
	contactDamage?: number
	tint?: ex.Color
}

const BULLET_LIFETIME_MS = 5000

export class Bullet extends ex.Actor {
	damage: number
	fromPlayer: boolean
	contactDamage: number
	private tint?: ex.Color
	private ageMs = 0
	private spent = false

	constructor(
		x: number,
		y: number,
		dx: number,
		dy: number,
		collisiongGroup: ex.CollisionGroup,
		options: BulletOptions = {},
	) {
		super({
			pos: new ex.Vector(x, y),
			vel: new ex.Vector(dx, dy),
			width: Config.bulletSize,
			height: Config.bulletSize,
		})
		this.body.collisionType = ex.CollisionType.Passive
		this.body.group = collisiongGroup
		this.damage = options.damage ?? 1
		this.fromPlayer = options.fromPlayer ?? false
		this.contactDamage = options.contactDamage ?? 0
		this.tint = options.tint
	}

	onInitialize(engine: ex.Engine) {
		this.on('precollision', (evt) => this.onPreCollision(evt))
		// Clean up on exit viewport
		this.on('exitviewport', () => this.killAndRemoveFromBullets())

		const anim = ex.Animation.fromSpriteSheet(
			gameSheet,
			[3, 4, 5, 6, 7, 8, 7, 6, 5, 4],
			100,
			ex.AnimationStrategy.Loop,
		)
		anim.scale = new ex.Vector(2, 2)
		if (this.tint) {
			anim.tint = this.tint
		}
		this.graphics.use(anim)
	}

	onPreUpdate(_engine: ex.Engine, delta: number) {
		this.ageMs += delta
		if (this.ageMs > BULLET_LIFETIME_MS) {
			this.killAndRemoveFromBullets()
		}
	}

	private onPreCollision(evt: ex.PreCollisionEvent) {
		if (this.spent || evt.other instanceof Bullet) {
			return
		}
		this.spent = true
		if (this.fromPlayer && isDamageable(evt.other)) {
			evt.other.takeHit(this.damage, true)
		}
		this.killAndRemoveFromBullets()
	}

	private killAndRemoveFromBullets() {
		this.kill()
		ex.Util.removeItemFromArray(this, Baddie.Bullets)
	}
}
