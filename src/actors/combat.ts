// Something that hurts the ship when it touches it.
export interface Hazard {
	contactDamage: number
}

// Something the ship's bullets can damage.
export interface Damageable {
	takeHit(damage: number, byPlayer: boolean): void
}

export function isHazard(other: unknown): other is Hazard {
	return !!other && typeof (other as Hazard).contactDamage === 'number'
}

export function isDamageable(other: unknown): other is Damageable {
	return !!other && typeof (other as Damageable).takeHit === 'function'
}
