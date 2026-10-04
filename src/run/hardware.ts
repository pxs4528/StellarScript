import Config from '../config'
import { TICK_MS } from '../script-runner'

export type UpgradeId = 'sensors' | 'cannon' | 'thrusters' | 'gyros' | 'clock'
export type PartId = 'radar' | 'shield'

export const MAX_UPGRADE_LEVEL = 4
export const REPAIR_PRICE = 3
export const REPAIR_HULL = 25
// The run ship turns twice as fast as the sandbox ship, so aiming is practical.
const BASE_TURN_SCALE = 2

export const UPGRADES: Record<UpgradeId, { name: string; text: string }> = {
	sensors: { name: 'Sensors', text: '+250 sensor range.' },
	cannon: { name: 'Cannon', text: 'Fires 20% faster.' },
	thrusters: { name: 'Thrusters', text: '+15% speed.' },
	gyros: { name: 'Gyros', text: '+25% turn rate.' },
	clock: { name: 'Clock', text: 'loop() runs 15 ms sooner each tick.' },
}

export const PARTS: Record<PartId, { name: string; text: string; price: number }> = {
	radar: {
		name: 'Radar',
		text:
			'New pins: read(RADAR_BEARING) is degrees to the nearest contact (negative is left), read(RADAR_DISTANCE) is how far, or -1.',
		price: 8,
	},
	shield: {
		name: 'Shield',
		text: 'New pin: write(SHIELD, HIGH) blocks all damage while it burns extra fuel.',
		price: 7,
	},
}

export function upgradeCost(level: number): number {
	return 3 + 2 * level
}

export function newUpgradeLevels(): Record<UpgradeId, number> {
	return { sensors: 0, cannon: 0, thrusters: 0, gyros: 0, clock: 0 }
}

export interface ShipSpecs {
	sensorRange: number
	fireThrottleMs: number
	speedScale: number
	turnScale: number
	tickMs: number
}

export function shipSpecs(levels: Record<UpgradeId, number>): ShipSpecs {
	return {
		sensorRange: 700 + 250 * levels.sensors,
		fireThrottleMs: Config.playerFireThrottle * Math.pow(0.8, levels.cannon),
		speedScale: 1 + 0.15 * levels.thrusters,
		turnScale: BASE_TURN_SCALE * (1 + 0.25 * levels.gyros),
		tickMs: TICK_MS - 15 * levels.clock,
	}
}
