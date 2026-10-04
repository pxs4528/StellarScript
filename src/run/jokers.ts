export type JokerId =
	| 'code-golf'
	| 'pure-function'
	| 'rubber-duck'
	| 'off-by-one'
	| 'technical-debt'
	| 'race-condition'
	| 'garbage-collector'
	| 'hot-path'

export interface JokerDef {
	id: JokerId
	name: string
	text: string
	price: number
	sellable: boolean
}

export const MAX_JOKERS = 5
export const CODE_GOLF_MAX_LINES = 20
export const TECHNICAL_DEBT_CREDITS = 10
export const TECHNICAL_DEBT_HULL = 6
export const RACE_CONDITION_SWAP_CHANCE = 0.12
export const GARBAGE_COLLECTOR_ASTEROIDS_PER_CREDIT = 5
export const RUBBER_DUCK_COOLDOWN_MS = 1000

export const JOKERS: Record<JokerId, JokerDef> = {
	'code-golf': {
		id: 'code-golf',
		name: 'Code Golf',
		text: `+2 mult while your script is ${CODE_GOLF_MAX_LINES} lines or fewer.`,
		price: 5,
		sellable: true,
	},
	'pure-function': {
		id: 'pure-function',
		name: 'Pure Function',
		text: 'x1.5 mult until your script calls g_set() in an encounter.',
		price: 5,
		sellable: true,
	},
	'rubber-duck': {
		id: 'rubber-duck',
		name: 'Rubber Duck',
		text: 'print() repairs 1 hull, at most once a second.',
		price: 4,
		sellable: true,
	},
	'off-by-one': {
		id: 'off-by-one',
		name: 'Off By One',
		text: 'Every second shot fires two bullets side by side.',
		price: 6,
		sellable: true,
	},
	'technical-debt': {
		id: 'technical-debt',
		name: 'Technical Debt',
		text:
			`+${TECHNICAL_DEBT_CREDITS} credits now. Lose ${TECHNICAL_DEBT_HULL} hull at the start of every encounter. Cannot be sold.`,
		price: 0,
		sellable: false,
	},
	'race-condition': {
		id: 'race-condition',
		name: 'Race Condition',
		text: 'x2 mult, but 12% of engine writes land on the other engine.',
		price: 6,
		sellable: true,
	},
	'garbage-collector': {
		id: 'garbage-collector',
		name: 'Garbage Collector',
		text:
			`+1 credit for every ${GARBAGE_COLLECTOR_ASTEROIDS_PER_CREDIT} asteroids you shoot in an encounter.`,
		price: 4,
		sellable: true,
	},
	'hot-path': {
		id: 'hot-path',
		name: 'Hot Path',
		text: '+0.25 mult per kill in a row without taking damage (max +5).',
		price: 7,
		sellable: true,
	},
}

export interface MultContext {
	codeLines: number
	usedGlobalSet: boolean
	streak: number
}

// Salvage multiplier: (1 + every "+mult") times every "x mult".
export function computeMult(owned: JokerId[], ctx: MultContext): number {
	let plus = 0
	let times = 1
	if (owned.includes('code-golf') && ctx.codeLines <= CODE_GOLF_MAX_LINES) {
		plus += 2
	}
	if (owned.includes('hot-path')) {
		plus += Math.min(5, ctx.streak * 0.25)
	}
	if (owned.includes('pure-function') && !ctx.usedGlobalSet) {
		times *= 1.5
	}
	if (owned.includes('race-condition')) {
		times *= 2
	}
	return (1 + plus) * times
}

// Lines that count toward Code Golf: not blank and not a // comment.
export function countCodeLines(code: string): number {
	return code
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('//'))
		.length
}

export function sellPrice(id: JokerId): number {
	return Math.floor(JOKERS[id].price / 2)
}
