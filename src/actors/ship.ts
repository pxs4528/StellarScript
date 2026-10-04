import * as ex from 'excalibur'
import Config from '../config'
import { gameSheet, Sounds } from '../resources'
import { Bullet } from './bullet'
import { isHazard } from './combat'

export class Ship extends ex.Actor {
	static group = ex.CollisionGroupManager.create('player')

	isLeftEngineOn = false
	isRightEngineOn = false
	isLeftSensorTriggered = false
	isRightSensorTriggered = false
	shouldFireBullet = false
	shieldOn = false

	// Hardware. The defaults are the sandbox ship; a run overrides them from its upgrades.
	speedScale = 1
	turnScale = 1
	fireThrottleMs = Config.playerFireThrottle
	sensorRange = Infinity
	// Sideways distance of each sensor from the nose, and how far it angles outward (radians).
	sensorOffset = 64
	sensorSpread = 0
	// Fire a second bullet alongside every Nth shot. 0 turns it off.
	twinShotEvery = 0

	// Called when something harmful touches the ship. Unset means the ship cannot be hurt.
	onHit?: (damage: number, source: ex.Actor) => void

	private lastFiredAt = 0
	private shotCount = 0

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
	}

	onPreCollision(evt: ex.PreCollisionEvent) {
		const other = evt.other as unknown
		if (this.onHit && isHazard(other) && other.contactDamage > 0) {
			this.onHit(other.contactDamage, other as unknown as ex.Actor)
		}
	}

	onPreUpdate(_engine: ex.Engine, delta: number): void {
		// Change angular velocity based on engines
		const turnRate = this.turnScale * Config.playerTurnRate
		const turnAccel = this.turnScale * Config.playerTurnAccel * delta / 1000
		if (this.isLeftEngineOn && !this.isRightEngineOn) {
			// Rotate to the right
			if (Config.physicsMode === 'simple') {
				this.body.angularVelocity = turnRate
			} else {
				this.body.angularVelocity += turnAccel
			}
		} else if (!this.isLeftEngineOn && this.isRightEngineOn) {
			// Rotate to the left
			if (Config.physicsMode === 'simple') {
				this.body.angularVelocity = -turnRate
			} else {
				this.body.angularVelocity -= turnAccel
			}
		} else {
			if (Config.physicsMode === 'simple') {
				this.body.angularVelocity = 0
			}
		}

		// Change velocity based on engines
		const numEnginesOn = [this.isLeftEngineOn, this.isRightEngineOn].filter((v) => v).length
		const speed = numEnginesOn * Config.playerSpeedPerEngine * this.speedScale
		this.body.vel = ex.vec(0, -speed).rotate(this.rotation)
	}

	onPostUpdate(engine: ex.Engine, delta: number) {
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
		this.isLeftSensorTriggered = this.castSensor(-1)
		this.isRightSensorTriggered = this.castSensor(1)

		// Fire bullet if needed
		if (this.shouldFireBullet) {
			this.shouldFireBullet = false
			const now = Date.now()
			if (now - this.lastFiredAt > this.fireThrottleMs) {
				this.lastFiredAt = now
				this.fire()
			}
		}
	}

	private castSensor(side: -1 | 1): boolean {
		if (!this.scene) {
			return false
		}
		const origin = this.pos
			.add(ex.Vector.Up.scale(32).rotate(this.rotation))
			.add(ex.Vector.Right.scale(side * this.sensorOffset).rotate(this.rotation))
		const direction = ex.Vector.Up.rotate(this.rotation + side * this.sensorSpread)
		const hits = this.scene.physics.rayCast(new ex.Ray(origin, direction), {
			maxDistance: this.sensorRange,
			searchAllColliders: true,
		})
		// Sensors see through bullets and the ship itself.
		return hits.some((hit) =>
			hit.collider.owner !== this && !(hit.collider.owner instanceof Bullet)
		)
	}

	private fire() {
		this.shotCount++
		const isTwinShot = this.twinShotEvery > 0 && this.shotCount % this.twinShotEvery === 0
		const offsets = isTwinShot ? [-22, 22] : [0]
		const vel = ex.Vector.Up.scale(Config.playerBulletVelocity).rotate(this.rotation)
		for (const offset of offsets) {
			const pos = this.pos.add(ex.vec(offset, -48).rotate(this.rotation))
			this.scene.add(new Bullet(pos.x, pos.y, vel.x, vel.y, Ship.group, { fromPlayer: true }))
		}
		Sounds.laserSound.play()
	}
}
