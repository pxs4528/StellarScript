import * as ex from 'excalibur'
import Config from '../config'
import { explosionSpriteSheet, gameSheet, Sounds } from '../resources'
import { stats } from '../stats'
import { animManager } from './animation-manager'
import { Asteroid } from './asteroid'
import { Baddie } from './baddie'
import { Bullet } from './bullet'

type FireFunction = (engine: ex.Engine) => void
const throttle = function(this: any, func: FireFunction, throttle: number): FireFunction {
	var lastTime = Date.now()
	var throttle = throttle
	return (engine: ex.Engine) => {
		var currentTime = Date.now()
		if (currentTime - lastTime > throttle) {
			var val = func.apply(this, [engine])
			lastTime = currentTime
			return val
		}
	}
}

export class Ship extends ex.Actor {
	static group = ex.CollisionGroupManager.create('player')
	private flipBarrel = false
	private throttleFire?: FireFunction
	private explode?: ex.Animation

	isLeftEngineOn = false
	isRightEngineOn = false
	isLeftSensorTriggered = false
	isRightSensorTriggered = false
	shouldFireBullet = false

	constructor(x: number, y: number, width: number, height: number) {
		super({
			pos: new ex.Vector(x, y),
			width: width,
			height: height,
		})

		this.body.collisionType = ex.CollisionType.Passive
		// Player group does not collide with itself
		this.body.group = Ship.group
	}

	onInitialize(engine: ex.Engine) {
		this.throttleFire = throttle(this.fire, Config.playerFireThrottle)
		this.on('precollision', (evt) => this.onPreCollision(evt))

		// Get animation
		const anim = ex.Animation.fromSpriteSheet(
			gameSheet,
			[19],
			100,
			ex.AnimationStrategy.Loop,
		)
		anim.scale = new ex.Vector(4, 4)
		this.graphics.use(anim)

		this.explode = ex.Animation.fromSpriteSheet(
			explosionSpriteSheet,
			ex.range(0, explosionSpriteSheet.sprites.length - 1),
			40,
			ex.AnimationStrategy.End,
		)
		this.explode.scale = new ex.Vector(3, 3)
	}

	onPreCollision(evt: ex.PreCollisionEvent) {
		// if (evt.other instanceof Baddie || ex.Util.contains(Baddie.Bullets, evt.other)) {
		// 	Sounds.hitSound.play()
		// 	this.actions.blink(300, 300, 3)
		// 	stats.hp -= Config.enemyDamage
		// 	if (stats.hp <= 0) {
		// 		stats.gameOver = true
		// 		this.kill()
		// 		this.stopRegisteringFireThrottleEvent()
		// 	}
		// }
	}

	private stopRegisteringFireThrottleEvent = () => {
		this.throttleFire = undefined
	}

	onPreUpdate(_engine: ex.Engine, delta: number): void {
		// Change angular velocity based on engines
		if (this.isLeftEngineOn && !this.isRightEngineOn) {
			// Rotate to the right
			if (Config.physicsMode === 'simple') {
				this.body.angularVelocity = Math.PI / (delta / 2)
			} else {
				this.body.angularVelocity += Math.PI / (delta * 32)
			}
		} else if (!this.isLeftEngineOn && this.isRightEngineOn) {
			// Rotate to the left
			if (Config.physicsMode === 'simple') {
				this.body.angularVelocity = -Math.PI / (delta / 2)
			} else {
				this.body.angularVelocity -= Math.PI / (delta * 32)
			}
		} else {
			if (Config.physicsMode === 'simple') {
				this.body.angularVelocity = 0
			}
		}

		// Change velocity based on engines
		const numEnginesOn = [this.isLeftEngineOn, this.isRightEngineOn].filter((v) => v).length
		const speed = numEnginesOn * Config.playerSpeedPerEngine
		this.body.vel = ex.vec(0, -speed).rotate(this.rotation)
	}

	onPostUpdate(engine: ex.Engine, delta: number) {
		if (stats.hp <= 0 && this.explode) {
			// update game to display game over
			// gameOver = true;
			animManager.play(this.explode, this.pos)
			Sounds.explodeSound.play()
			this.kill()
		}

		// Update sprite based on engines
		const sprite = 16 + (!this.isLeftEngineOn ? 2 : 0) + (!this.isRightEngineOn ? 1 : 0)
		const anim = ex.Animation.fromSpriteSheet(
			gameSheet,
			[sprite],
			100,
			ex.AnimationStrategy.Loop,
		)
		anim.scale = new ex.Vector(4, 4)
		this.graphics.use(anim)

		// Update sensor outputs
		const up = ex.Vector.Up.rotate(this.body.rotation)
		const leftRay = new ex.Ray(
			this.pos.add(up.scale(32)).add(ex.Vector.Left.scale(64).rotate(this.body.rotation)),
			up,
		)
		const leftHits = this.scene.physics.rayCast(leftRay, { collisionGroup: Asteroid.group })
		this.isLeftSensorTriggered = !!leftHits.length
		const rightRay = new ex.Ray(
			this.pos.add(up.scale(32)).add(ex.Vector.Right.scale(64).rotate(this.body.rotation)),
			up,
		)
		const rightHits = this.scene.physics.rayCast(rightRay, { collisionGroup: Asteroid.group })
		this.isRightSensorTriggered = !!rightHits.length

		// Fire bullet if needed
		if (this.shouldFireBullet) {
			this.shouldFireBullet = false
			this.throttleFire ? this.throttleFire(engine) : null
		}
	}

	private fire = (engine: ex.Engine) => {
		const pos = this.pos.add(ex.vec(0, -48).rotate(this.rotation))
		const vel = ex.Vector.Up.scale(Config.playerBulletVelocity).rotate(this.rotation)
		const bullet = new Bullet(
			pos.x,
			pos.y,
			vel.x,
			vel.y,
			Ship.group,
		)
		this.flipBarrel = !this.flipBarrel
		Sounds.laserSound.play()
		engine.add(bullet)
	}
}
