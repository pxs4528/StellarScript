import Config from '../config'
import { BossRuleId, ENCOUNTERS_PER_SYSTEM, rollBossRule } from './encounters'
import { newUpgradeLevels, PartId, UpgradeId } from './hardware'
import { JokerId } from './jokers'

export const STARTER_CODE = `// loop() runs every tick. Pins are listed under the editor.
function loop() {
  const left = read(SENSOR_LEFT);
  const right = read(SENSOR_RIGHT);

  // Shoot whenever a sensor sees something.
  write(WEAPON, left || right ? HIGH : LOW);

  // Steer toward the side that sees something. With nothing in sight, circle right.
  write(ENGINE_LEFT, left && !right ? LOW : HIGH);
  write(ENGINE_RIGHT, left ? HIGH : LOW);
}`

// Everything that carries over between encounters in one run.
export class RunState {
	system = 1
	encounter = 0
	hull = Config.totalHp
	maxHull = Config.totalHp
	credits = 4
	jokers: JokerId[] = []
	upgrades: Record<UpgradeId, number> = newUpgradeLevels()
	parts: PartId[] = []
	code = STARTER_CODE
	bossRule: BossRuleId = rollBossRule()
	totalSalvage = 0
	kills = 0

	hasJoker(id: JokerId): boolean {
		return this.jokers.includes(id)
	}

	hasPart(id: PartId): boolean {
		return this.parts.includes(id)
	}

	repair(amount: number) {
		this.hull = Math.min(this.maxHull, this.hull + amount)
	}

	// Move on to the next encounter, and to the next system after the boss.
	advance() {
		this.encounter++
		if (this.encounter >= ENCOUNTERS_PER_SYSTEM) {
			this.encounter = 0
			this.system++
			this.bossRule = rollBossRule()
		}
	}
}

export let run = new RunState()

export function startNewRun() {
	run = new RunState()
}
