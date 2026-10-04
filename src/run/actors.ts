import * as ex from 'excalibur'
import { AnimationManager } from '../actors/animation-manager'
import { Bullet } from '../actors/bullet'
import { Damageable, Hazard } from '../actors/combat'
import { Ship } from '../actors/ship'
import { explosionSpriteSheet, gameSheet, Images, Sounds } from '../resources'

export type TargetKind = 'asteroid' | 'drone' | 'boss'
export type DestroyedHandler = (target: RunTarget, byPlayer: boolean) => void

const rockGroup = ex.CollisionGroupManager.create('run-rock')
const enemyGroup = ex.CollisionGroupManager.create('run-enemy')
const ENEMY_BULLET_TINT = ex.Color.fromHex('#ff5a5a')

function explosion(scale: number): ex.Animation {
	const anim = ex.Animation.fromSpriteSheet(
		explosionSpriteSheet,
		ex.range(0, explosionSpriteSheet.sprites.length - 1),
		40,
		ex.AnimationStrategy.End,
	)
	anim.scale = new ex.Vector(scale, scale)
	return anim
}

// Anything in an encounter that the ship can shoot for salvage.
export abstract class RunTarget extends ex.Actor implements Hazard, Damageable {
	abstract readonly kind: TargetKind
	abstract readonly salvage: number
	abstract contactDamage: number
	protected explosionScale = 3
	isDestroyed = false

	constructor(
		config: ex.ActorArgs,
		public hp: number,
		protected fx: AnimationManager,
		private onDestroyed: DestroyedHandler,
	) {
		super(config)
		this.body.collisionType = ex.CollisionType.Passive
	}

	takeHit(damage: number, byPlayer: boolean) {
		if (this.isDestroyed) {
			return
		}
		this.hp -= damage
		if (this.hp <= 0) {
			this.destroy(byPlayer)
		} else {
			this.actions.blink(60, 60, 2)
		}
	}

	destroy(byPlayer: boolean) {
		if (this.isDestroyed) {
			return
		}
		this.isDestroyed = true
		Sounds.explodeSound.play()
		this.fx.play(explosion(this.explosionScale), this.pos)
		this.onDestroyed(this, byPlayer)
		this.kill()
	}

	// Leave the encounter without an explosion or salvage.
	despawn() {
		this.isDestroyed = true
		this.kill()
	}
}

export class Rock extends RunTarget {
	readonly kind = 'asteroid'
	readonly salvage = 10
	contactDamage = 10

	constructor(pos: ex.Vector, fx: AnimationManager, onDestroyed: DestroyedHandler) {
		super({ pos, radius: 52 }, 1, fx, onDestroyed)
		this.body.group = rockGroup
		const angle = Math.random() * Math.PI * 2
		this.vel = ex.vec(Math.cos(angle), Math.sin(angle)).scale(Math.random() * 60)
		this.angularVelocity = (Math.random() - 0.5) * 1.5
	}

	onInitialize() {
		const anim = ex.Animation.fromSpriteSheet(gameSheet, [23], 100, ex.AnimationStrategy.Loop)
		anim.scale = new ex.Vector(4, 4)
		this.graphics.use(anim)
		// Ramming a rock breaks it, but earns nothing.
		this.on('precollision', (evt) => {
			if (evt.other instanceof Ship) {
				this.destroy(false)
			}
		})
	}
}

// Chases the ship and shoots straight at it.
export class Drone extends RunTarget {
	readonly kind = 'drone'
	readonly salvage = 25
	contactDamage = 15

	private sinceFiredMs = Math.random() * 1000

	constructor(
		pos: ex.Vector,
		hp: number,
		private ship: Ship,
		fx: AnimationManager,
		onDestroyed: DestroyedHandler,
	) {
		super({ pos, radius: 40 }, hp, fx, onDestroyed)
		this.body.group = enemyGroup
	}

	onInitialize() {
		const anim = ex.Animation.fromSpriteSheet(
			gameSheet,
			[10, 11, 12],
			100,
			ex.AnimationStrategy.Loop,
		)
		anim.scale = new ex.Vector(4, 4)
		this.graphics.use(anim)
		this.on('precollision', (evt) => {
			if (evt.other instanceof Ship) {
				this.destroy(false)
			}
		})
	}

	onPreUpdate(_engine: ex.Engine, delta: number) {
		const toShip = this.ship.pos.sub(this.pos)
		const distance = toShip.size
		// Close in, then hold at range.
		this.vel = distance > 380 ? toShip.normalize().scale(130) : ex.Vector.Zero

		this.sinceFiredMs += delta
		if (this.sinceFiredMs > 1700 && distance < 950 && !this.ship.isKilled()) {
			this.sinceFiredMs = 0
			const vel = toShip.normalize().scale(320)
			this.scene.add(
				new Bullet(this.pos.x, this.pos.y, vel.x, vel.y, enemyGroup, {
					contactDamage: 6,
					tint: ENEMY_BULLET_TINT,
				}),
			)
			Sounds.enemyFireSound.play()
		}
	}
}

// Slow, tough, and fires a three-way spread. Placeholder sprite.
export class Boss extends RunTarget {
	readonly kind = 'boss'
	readonly salvage = 80
	contactDamage = 20
	protected explosionScale = 8

	private sinceFiredMs = 0

	constructor(
		pos: ex.Vector,
		hp: number,
		private ship: Ship,
		fx: AnimationManager,
		onDestroyed: DestroyedHandler,
	) {
		super({ pos, radius: 84 }, hp, fx, onDestroyed)
		this.body.group = enemyGroup
	}

	onInitialize() {
		const sprite = Images.boss.toSprite()
		sprite.scale = new ex.Vector(3, 3)
		this.graphics.use(sprite)
	}

	onPreUpdate(_engine: ex.Engine, delta: number) {
		const toShip = this.ship.pos.sub(this.pos)
		const distance = toShip.size
		this.vel = distance > 450 ? toShip.normalize().scale(70) : ex.Vector.Zero

		this.sinceFiredMs += delta
		if (this.sinceFiredMs > 1500 && distance < 1100 && !this.ship.isKilled()) {
			this.sinceFiredMs = 0
			for (const spread of [-0.22, 0, 0.22]) {
				const vel = toShip.normalize().scale(300).rotate(spread)
				this.scene.add(
					new Bullet(this.pos.x, this.pos.y, vel.x, vel.y, enemyGroup, {
						contactDamage: 8,
						tint: ENEMY_BULLET_TINT,
					}),
				)
			}
			Sounds.enemyFireSound.play()
		}
	}
}
