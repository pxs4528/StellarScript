import * as ex from 'excalibur'
import { AnimationManager } from '../actors/animation-manager'
import { Ship } from '../actors/ship'
import Config from '../config'
import { explosionSpriteSheet, Images, Sounds } from '../resources'
import { Pins, ScriptRunner } from '../script-runner'
import { Boss, Drone, Rock, RunTarget } from './actors'
import { JokerIcons } from './art'
import { BOSS_RULES, EncounterPlan, ENCOUNTERS_PER_SYSTEM, planEncounter } from './encounters'
import { shipSpecs } from './hardware'
import {
	computeMult,
	countCodeLines,
	GARBAGE_COLLECTOR_ASTEROIDS_PER_CREDIT,
	JOKERS,
	RACE_CONDITION_SWAP_CHANCE,
	RUBBER_DUCK_COOLDOWN_MS,
	TECHNICAL_DEBT_HULL,
} from './jokers'
import { run } from './run-state'
import './run.css'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement

const BACKGROUND_TILES = 40
// Rocks and drones appear beyond the edge of the screen and are dropped when left far behind.
const SPAWN_MIN_RADIUS = 1350
const SPAWN_MAX_RADIUS = 2400
const CULL_RADIUS = 3200
const RADAR_RANGE = 1800
const FUEL_PER_SECOND = 1
const FUEL_PER_ENGINE_SECOND = 0.5
const FUEL_PER_SHIELD_SECOND = 3
const SHIELD_HIT_FUEL = 2
const HIT_INVULNERABLE_MS = 1000
const FUEL_PER_BONUS_CREDIT = 15
const MAX_FUEL_BONUS = 3
const BOSS_CLEAR_REPAIR = 20
const OUTPUT_LINES = 6

type EncounterState = 'playing' | 'won' | 'lost'

// One encounter of a run: fly the deployed script until the salvage target is met,
// or the hull or the fuel runs out.
export class EncounterScene extends ex.Scene {
	private plan: EncounterPlan = planEncounter(run.system, run.encounter)
	private fx = new AnimationManager()
	private ship!: Ship
	private shield!: ex.Actor
	private runner!: ScriptRunner
	private targets: RunTarget[] = []

	private state: EncounterState = 'playing'
	private salvage = 0
	private fuel = this.plan.fuel
	private streak = 0
	private asteroidsShot = 0
	private usedGlobalSet = false
	private codeLines = countCodeLines(run.code)

	private clockMs = 0
	private invulnerableUntilMs = 0
	private lastDuckRepairMs = -RUBBER_DUCK_COOLDOWN_MS
	private sinceSpawnCheckMs = 0
	private sinceDroneMs = 0
	private sinceHudMs = 0
	private output: { text: string; count: number }[] = []
	private warnedPins: number[] = []

	private get bossRuleActive() {
		return this.plan.hasBoss
	}

	onInitialize(_engine: ex.Engine) {
		this.addBackground()

		this.fx.z = 50
		this.add(this.fx)

		const specs = shipSpecs(run.upgrades)
		const ship = new Ship(0, 0, 80, 80)
		ship.sensorOffset = 20
		ship.sensorSpread = 0.06
		ship.sensorRange = specs.sensorRange
		ship.speedScale = specs.speedScale
		ship.turnScale = specs.turnScale
		ship.fireThrottleMs = specs.fireThrottleMs
		if (this.bossRuleActive && run.bossRule === 'overheat') {
			ship.fireThrottleMs *= 2
		}
		if (run.hasJoker('off-by-one')) {
			ship.twinShotEvery = 2
		}
		ship.onHit = (damage) => this.onShipHit(damage)
		this.add(ship)
		this.ship = ship

		const shieldSprite = Images.shield.toSprite()
		shieldSprite.scale = new ex.Vector(3.5, 3.5)
		this.shield = new ex.Actor({ pos: ship.pos.clone(), z: 10 })
		this.shield.body.collisionType = ex.CollisionType.PreventCollision
		this.shield.graphics.use(shieldSprite)
		this.shield.graphics.visible = false
		this.add(this.shield)

		this.runner = new ScriptRunner({
			read: (pin) => this.readPin(pin),
			write: (pin, value) => this.writePin(pin, value),
			print: (message) => this.print(message),
			onGlobalSet: () => {
				this.usedGlobalSet = true
			},
		})
		this.runner.code = run.code
		this.runner.tickMs = specs.tickMs
		if (this.bossRuleActive && run.bossRule === 'lag') {
			this.runner.delayScale = 2
		}

		if (run.hasJoker('technical-debt')) {
			run.hull = Math.max(1, run.hull - TECHNICAL_DEBT_HULL)
		}

		for (let i = 0; i < this.plan.rocks; i++) {
			this.spawnRock(450, SPAWN_MAX_RADIUS)
		}
		for (let i = 0; i < this.plan.startingDrones; i++) {
			this.spawnDrone()
		}
		if (this.plan.hasBoss) {
			this.addTarget(
				new Boss(ex.vec(0, -950), this.plan.bossHp, ship, this.fx, this.onTargetDestroyed),
			)
		}
	}

	onActivate(context: ex.SceneActivationContext) {
		const rule = BOSS_RULES[run.bossRule]
		rootDiv.innerHTML = `
			<section id="hud">
				<div class="hud-top">
					<div class="hud-box hud-wide">
						<label>SALVAGE <span id="hud-salvage"></span></label>
						<div class="hud-bar"><i id="hud-salvage-bar" class="salvage"></i></div>
					</div>
					<div class="hud-box">
						<label>MULT</label>
						<span id="hud-mult" class="hud-big"></span>
					</div>
					<div class="hud-box">
						<label>HULL <span id="hud-hull"></span></label>
						<div class="hud-bar"><i id="hud-hull-bar" class="hull"></i></div>
					</div>
					<div class="hud-box">
						<label>FUEL <span id="hud-fuel"></span></label>
						<div class="hud-bar"><i id="hud-fuel-bar" class="fuel"></i></div>
					</div>
				</div>
				<div id="hud-title">
					SYSTEM ${run.system} · ${
			run.encounter + 1
		}/${ENCOUNTERS_PER_SYSTEM} · ${this.plan.name.toUpperCase()}
				</div>
				${
			this.bossRuleActive
				? `<div id="hud-rule">${rule.name.toUpperCase()}: ${rule.text}</div>`
				: ''
		}
				<div id="hud-jokers">
					${
			run.jokers
				.map((id) => `<img class="px-icon" src="${JokerIcons[id]}" title="${JOKERS[id].name}">`)
				.join('')
		}
				</div>
				<pre id="hud-output"></pre>
				<button id="hud-abandon" class="run-button red">Abandon run</button>
				<div id="hud-overlay" style="display: none"></div>
			</section>
		`
		const abandonButton = document.getElementById('hud-abandon') as HTMLButtonElement
		abandonButton.onclick = () => {
			context.engine.goToScene('mainmenu')
		}
		this.refreshHud()
		this.renderOutput()
	}

	onDeactivate() {
		this.runner.reset()
		rootDiv.innerHTML = ''
	}

	onPreUpdate(engine: ex.Engine, delta: number) {
		if (this.state !== 'playing') {
			return
		}
		this.clockMs += delta
		this.runner.update(engine, delta)

		const seconds = delta / 1000
		const enginesOn = Number(this.ship.isLeftEngineOn) + Number(this.ship.isRightEngineOn)
		this.fuel -= seconds * (FUEL_PER_SECOND + enginesOn * FUEL_PER_ENGINE_SECOND)
		if (this.ship.shieldOn) {
			this.fuel -= seconds * FUEL_PER_SHIELD_SECOND
		}

		this.sinceSpawnCheckMs += delta
		if (this.sinceSpawnCheckMs > 500) {
			this.sinceSpawnCheckMs = 0
			this.maintainRocks()
		}
		if (this.plan.maxDrones > 0) {
			this.sinceDroneMs += delta
			if (this.sinceDroneMs > this.plan.droneEveryMs) {
				this.sinceDroneMs = 0
				if (this.countTargets('drone') < this.plan.maxDrones) {
					this.spawnDrone()
				}
			}
		}

		this.sinceHudMs += delta
		if (this.sinceHudMs > 100) {
			this.sinceHudMs = 0
			this.refreshHud()
		}

		if (this.salvage >= this.plan.target) {
			this.win()
		} else if (this.fuel <= 0) {
			this.fuel = 0
			this.lose('Out of fuel')
		}
	}

	onPostUpdate(_engine: ex.Engine, _delta: number) {
		this.camera.pos = this.ship.pos
		this.shield.pos = this.ship.pos.clone()
		this.shield.graphics.visible = this.ship.shieldOn && this.state === 'playing'
	}

	private get mult(): number {
		return computeMult(run.jokers, {
			codeLines: this.codeLines,
			usedGlobalSet: this.usedGlobalSet,
			streak: this.streak,
		})
	}

	// ---- Script pins ----

	private readPin(pin: number): number {
		switch (pin) {
			case Pins.ENGINE_LEFT:
				return Number(this.ship.isLeftEngineOn)
			case Pins.ENGINE_RIGHT:
				return Number(this.ship.isRightEngineOn)
			case Pins.SENSOR_LEFT:
				if (this.bossRuleActive && run.bossRule === 'jammer') {
					return 0
				}
				return Number(this.ship.isLeftSensorTriggered)
			case Pins.SENSOR_RIGHT:
				return Number(this.ship.isRightSensorTriggered)
			case Pins.RADAR_BEARING:
			case Pins.RADAR_DISTANCE: {
				if (!run.hasPart('radar')) {
					this.warnMissingPart(pin, 'a radar')
					return pin === Pins.RADAR_DISTANCE ? -1 : 0
				}
				const contact = this.nearestContact()
				if (pin === Pins.RADAR_DISTANCE) {
					return contact ? Math.round(contact.distance) : -1
				}
				return contact ? Math.round(contact.bearing) : 0
			}
			case Pins.SHIELD:
				return Number(this.ship.shieldOn)
			default:
				return 0
		}
	}

	private writePin(pin: number, value: number) {
		if (
			run.hasJoker('race-condition')
			&& (pin === Pins.ENGINE_LEFT || pin === Pins.ENGINE_RIGHT)
			&& Math.random() < RACE_CONDITION_SWAP_CHANCE
		) {
			pin = pin === Pins.ENGINE_LEFT ? Pins.ENGINE_RIGHT : Pins.ENGINE_LEFT
		}
		switch (pin) {
			case Pins.ENGINE_LEFT:
				this.ship.isLeftEngineOn = Boolean(value)
				break
			case Pins.ENGINE_RIGHT:
				this.ship.isRightEngineOn = Boolean(value)
				break
			case Pins.WEAPON:
				this.ship.shouldFireBullet = Boolean(value)
				break
			case Pins.SHIELD:
				if (run.hasPart('shield')) {
					this.ship.shieldOn = Boolean(value)
				} else {
					this.warnMissingPart(pin, 'a shield')
				}
				break
			default:
				break
		}
	}

	private warnMissingPart(pin: number, part: string) {
		if (this.warnedPins.includes(pin)) {
			return
		}
		this.warnedPins.push(pin)
		this.showInOutput(`Pin ${pin} does nothing: the ship has no ${part} yet.`)
	}

	private print(message: string) {
		if (
			run.hasJoker('rubber-duck')
			&& this.clockMs - this.lastDuckRepairMs >= RUBBER_DUCK_COOLDOWN_MS
		) {
			this.lastDuckRepairMs = this.clockMs
			run.repair(1)
		}
		this.showInOutput(message)
	}

	// Bearing is in degrees from the ship's nose: negative is to the left, positive to the right.
	private nearestContact(): { distance: number; bearing: number } | undefined {
		let nearest: RunTarget | undefined
		let nearestDistance = RADAR_RANGE
		for (const target of this.targets) {
			const distance = target.pos.distance(this.ship.pos)
			if (distance < nearestDistance) {
				nearest = target
				nearestDistance = distance
			}
		}
		if (!nearest) {
			return undefined
		}
		const forward = ex.Vector.Up.rotate(this.ship.rotation)
		const toTarget = nearest.pos.sub(this.ship.pos)
		const radians = Math.atan2(forward.cross(toTarget), forward.dot(toTarget))
		return { distance: nearestDistance, bearing: radians * 180 / Math.PI }
	}

	// ---- Combat ----

	private onTargetDestroyed = (target: RunTarget, byPlayer: boolean) => {
		this.targets = this.targets.filter((other) => other !== target)
		if (!byPlayer || this.state !== 'playing') {
			return
		}
		this.streak++
		run.kills++
		if (target.kind === 'asteroid') {
			this.asteroidsShot++
		}
		const gain = Math.round(target.salvage * this.mult)
		this.salvage += gain
		run.totalSalvage += gain
		this.showFloatingText(`+${gain}`, target.pos)
	}

	private onShipHit(damage: number) {
		if (this.state !== 'playing' || this.clockMs < this.invulnerableUntilMs) {
			return
		}
		this.invulnerableUntilMs = this.clockMs + HIT_INVULNERABLE_MS
		if (this.ship.shieldOn) {
			this.fuel -= SHIELD_HIT_FUEL
			return
		}
		Sounds.hitSound.play()
		this.ship.actions.blink(80, 80, 3)
		this.streak = 0
		run.hull -= damage
		if (run.hull <= 0) {
			run.hull = 0
			this.lose('Hull destroyed')
		}
	}

	private showFloatingText(text: string, pos: ex.Vector) {
		const label = new ex.Label({
			text,
			pos: pos.clone(),
			z: 60,
			color: ex.Color.fromHex('#ffe066'),
			font: new ex.Font({
				family: "'Press Start 2P', monospace",
				size: 30,
				unit: ex.FontUnit.Px,
				textAlign: ex.TextAlign.Center,
			}),
		})
		label.body.collisionType = ex.CollisionType.PreventCollision
		label.actions.moveBy(0, -90, 90).die()
		this.add(label)
	}

	// ---- Spawning ----

	private addBackground() {
		const tileMap = new ex.TileMap({
			rows: BACKGROUND_TILES,
			columns: BACKGROUND_TILES,
			tileWidth: Config.backgroundTileSize,
			tileHeight: Config.backgroundTileSize,
		})
		const half = BACKGROUND_TILES * Config.backgroundTileSize / 2
		tileMap.pos = ex.vec(-half, -half)
		tileMap.z = -99
		const sprite = Images.stars.toSprite()
		sprite.destSize.width = Config.backgroundTileSize
		sprite.destSize.height = Config.backgroundTileSize
		for (const tile of tileMap.tiles) {
			tile.addGraphic(sprite)
		}
		this.add(tileMap)
	}

	private addTarget(target: RunTarget) {
		this.targets.push(target)
		this.add(target)
	}

	private randomSpotAroundShip(minRadius: number, maxRadius: number): ex.Vector {
		const angle = Math.random() * Math.PI * 2
		const radius = minRadius + Math.random() * (maxRadius - minRadius)
		return this.ship.pos.add(ex.vec(Math.cos(angle), Math.sin(angle)).scale(radius))
	}

	private spawnRock(minRadius: number, maxRadius: number) {
		const pos = this.randomSpotAroundShip(minRadius, maxRadius)
		this.addTarget(new Rock(pos, this.fx, this.onTargetDestroyed))
	}

	private spawnDrone() {
		const pos = this.randomSpotAroundShip(SPAWN_MIN_RADIUS, SPAWN_MIN_RADIUS + 400)
		this.addTarget(new Drone(pos, this.plan.enemyHp, this.ship, this.fx, this.onTargetDestroyed))
	}

	private countTargets(kind: RunTarget['kind']): number {
		return this.targets.filter((target) => target.kind === kind).length
	}

	// Keep the field around the ship stocked as it flies.
	private maintainRocks() {
		for (const target of this.targets) {
			if (target.kind === 'asteroid' && target.pos.distance(this.ship.pos) > CULL_RADIUS) {
				target.despawn()
			}
		}
		this.targets = this.targets.filter((target) => !target.isDestroyed)
		for (let i = this.countTargets('asteroid'); i < this.plan.rocks; i++) {
			this.spawnRock(SPAWN_MIN_RADIUS, SPAWN_MAX_RADIUS)
		}
	}

	// ---- Ending ----

	private stopShip() {
		this.runner.reset()
		this.ship.isLeftEngineOn = false
		this.ship.isRightEngineOn = false
		this.ship.shouldFireBullet = false
		this.ship.shieldOn = false
	}

	private win() {
		this.state = 'won'
		this.stopShip()

		const lines: [string, number][] = [['Encounter cleared', this.plan.clearCredits]]
		const fuelBonus = Math.min(MAX_FUEL_BONUS, Math.floor(this.fuel / FUEL_PER_BONUS_CREDIT))
		if (fuelBonus > 0) {
			lines.push([`Fuel left (${Math.floor(this.fuel)})`, fuelBonus])
		}
		if (run.hasJoker('garbage-collector')) {
			const scrap = Math.floor(this.asteroidsShot / GARBAGE_COLLECTOR_ASTEROIDS_PER_CREDIT)
			if (scrap > 0) {
				lines.push([`Garbage Collector (${this.asteroidsShot} asteroids)`, scrap])
			}
		}
		const total = lines.reduce((sum, line) => sum + line[1], 0)
		run.credits += total
		if (this.plan.hasBoss) {
			run.repair(BOSS_CLEAR_REPAIR)
		}
		run.advance()

		this.refreshHud()
		this.showOverlay(
			`
			<h2>${this.plan.hasBoss ? 'SYSTEM CLEARED' : 'ENCOUNTER CLEARED'}</h2>
			<p>Salvage ${this.salvage} / ${this.plan.target}</p>
			<table>
				${
				lines.map(([label, credits]) => `<tr><td>${label}</td><td>+${credits}</td></tr>`).join(
					'',
				)
			}
				<tr class="total"><td>Credits earned</td><td>+${total}</td></tr>
			</table>
			${this.plan.hasBoss ? `<p>Hull repaired by ${BOSS_CLEAR_REPAIR}.</p>` : ''}
			<button id="hud-continue" class="run-button green">To the hangar</button>
		`,
			'hangar',
		)
	}

	private lose(reason: string) {
		this.state = 'lost'
		this.stopShip()
		if (run.hull <= 0) {
			const boom = ex.Animation.fromSpriteSheet(
				explosionSpriteSheet,
				ex.range(0, explosionSpriteSheet.sprites.length - 1),
				40,
				ex.AnimationStrategy.End,
			)
			boom.scale = new ex.Vector(5, 5)
			this.fx.play(boom, this.ship.pos)
			Sounds.explodeSound.play()
			this.ship.graphics.visible = false
		}

		this.refreshHud()
		this.showOverlay(
			`
			<h2>RUN OVER</h2>
			<p>${reason}.</p>
			<table>
				<tr><td>Reached</td><td>System ${run.system}, encounter ${
				run.encounter + 1
			}/${ENCOUNTERS_PER_SYSTEM}</td></tr>
				<tr><td>Total salvage</td><td>${run.totalSalvage}</td></tr>
				<tr><td>Kills</td><td>${run.kills}</td></tr>
			</table>
			<button id="hud-continue" class="run-button blue">Main menu</button>
		`,
			'mainmenu',
		)
	}

	private showOverlay(html: string, nextScene: string) {
		const overlay = document.getElementById('hud-overlay')
		if (!overlay) {
			return
		}
		overlay.innerHTML = `<div class="hud-panel">${html}</div>`
		overlay.style.display = 'flex'
		const abandonButton = document.getElementById('hud-abandon')
		if (abandonButton) {
			abandonButton.style.display = 'none'
		}
		const continueButton = document.getElementById('hud-continue') as HTMLButtonElement
		continueButton.onclick = () => {
			this.engine.goToScene(nextScene)
		}
	}

	// ---- HUD ----

	private refreshHud() {
		const setText = (id: string, text: string) => {
			const element = document.getElementById(id)
			if (element && element.textContent !== text) {
				element.textContent = text
			}
		}
		const setBar = (id: string, fraction: number) => {
			const element = document.getElementById(id)
			if (element) {
				element.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`
			}
		}
		setText('hud-salvage', `${this.salvage} / ${this.plan.target}`)
		setBar('hud-salvage-bar', this.salvage / this.plan.target)
		setText('hud-mult', `x${Number(this.mult.toFixed(2))}`)
		setText('hud-hull', `${run.hull} / ${run.maxHull}`)
		setBar('hud-hull-bar', run.hull / run.maxHull)
		setText('hud-fuel', `${Math.ceil(this.fuel)}`)
		setBar('hud-fuel-bar', this.fuel / this.plan.fuel)
	}

	private showInOutput(message: string) {
		const last = this.output[this.output.length - 1]
		if (last && last.text === message) {
			last.count++
		} else {
			this.output.push({ text: message, count: 1 })
			this.output = this.output.slice(-OUTPUT_LINES)
		}
		this.renderOutput()
	}

	private renderOutput() {
		const element = document.getElementById('hud-output')
		if (!element) {
			return
		}
		element.textContent = this.output
			.map((line) => (line.count > 1 ? `${line.text} (x${line.count})` : line.text))
			.join('\n')
		element.style.display = this.output.length ? 'block' : 'none'
	}
}
