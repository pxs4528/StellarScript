export type EncounterKind = 'field' | 'patrol' | 'boss'
export type BossRuleId = 'jammer' | 'lag' | 'overheat'

export const ENCOUNTERS_PER_SYSTEM = 3

export const BOSS_RULES: Record<BossRuleId, { name: string; text: string }> = {
	jammer: { name: 'Jammer', text: 'SENSOR_LEFT always reads 0.' },
	lag: { name: 'Lag', text: 'delay() takes twice as long.' },
	overheat: { name: 'Overheat', text: 'The cannon fires at half speed.' },
}

export interface EncounterPlan {
	kind: EncounterKind
	name: string
	// Salvage needed to clear the encounter.
	target: number
	fuel: number
	rocks: number
	startingDrones: number
	maxDrones: number
	droneEveryMs: number
	hasBoss: boolean
	enemyHp: number
	bossHp: number
	clearCredits: number
}

const KINDS: EncounterKind[] = ['field', 'patrol', 'boss']
const NAMES: Record<EncounterKind, string> = {
	field: 'Asteroid field',
	patrol: 'Enemy patrol',
	boss: 'Boss',
}
const TARGET_SCALE: Record<EncounterKind, number> = { field: 1, patrol: 1.35, boss: 2 }

export function rollBossRule(): BossRuleId {
	const ids = Object.keys(BOSS_RULES) as BossRuleId[]
	return ids[Math.floor(Math.random() * ids.length)]
}

// system counts from 1, index from 0.
export function planEncounter(system: number, index: number): EncounterPlan {
	const kind = KINDS[index]
	const growth = Math.pow(1.6, system - 1)
	const target = Math.round(60 * growth * TARGET_SCALE[kind] / 5) * 5
	const base = {
		kind,
		name: NAMES[kind],
		target,
		enemyHp: 1 + system,
		bossHp: 10 + 4 * system,
	}
	switch (kind) {
		case 'field':
			return {
				...base,
				fuel: 75,
				rocks: 30,
				startingDrones: 0,
				maxDrones: 0,
				droneEveryMs: 0,
				hasBoss: false,
				clearCredits: 3,
			}
		case 'patrol':
			return {
				...base,
				fuel: 90,
				rocks: 22,
				startingDrones: 1 + system,
				maxDrones: 3 + system,
				droneEveryMs: 9000,
				hasBoss: false,
				clearCredits: 4,
			}
		case 'boss':
			return {
				...base,
				fuel: 100,
				rocks: 16,
				startingDrones: system,
				maxDrones: 1 + system,
				droneEveryMs: 12000,
				hasBoss: true,
				clearCredits: 6,
			}
	}
}
