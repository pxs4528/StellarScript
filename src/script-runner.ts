import * as ex from 'excalibur'

export const TICK_MS = 100

export const Pins = {
	ENGINE_LEFT: 0,
	ENGINE_RIGHT: 1,
	SENSOR_LEFT: 2,
	SENSOR_RIGHT: 3,
	WEAPON: 4,
	RADAR_BEARING: 5,
	RADAR_DISTANCE: 6,
	SHIELD: 7,
}

// Declared ahead of the player's code, so scripts can use the names without defining them.
const CONSTANTS: Record<string, number> = { ...Pins, LOW: 0, HIGH: 1 }
const PRELUDE = Object.keys(CONSTANTS)
	.map((name) => `const ${name} = ${CONSTANTS[name]};`)
	.join('\n')

export interface ScriptHost {
	read(pin: number): number
	write(pin: number, value: number): void
	print(message: string): void
	onGlobalSet?(): void
}

// Runs the player's loop() once per tick against a host that owns the hardware.
export class ScriptRunner {
	code = ''
	tickMs = TICK_MS
	delayScale = 1

	private globals: Record<string, any> = {}
	private isRunning = false
	private sinceLastRunMs = 0
	private generation = 0

	constructor(private host: ScriptHost) {}

	// Forget globals and cut off any loop() still waiting on a delay.
	reset() {
		this.generation++
		this.globals = {}
		this.isRunning = false
		this.sinceLastRunMs = 0
	}

	update(engine: ex.Engine, delta: number) {
		this.sinceLastRunMs += delta
		if (this.isRunning) {
			this.sinceLastRunMs = 0
		}
		if (this.sinceLastRunMs >= this.tickMs) {
			this.sinceLastRunMs = 0
			this.run(engine)
		}
	}

	private async run(engine: ex.Engine) {
		const generation = this.generation
		const isCurrent = () => generation === this.generation
		const globals = this.globals
		const host = this.host
		const delayMs = this.tickMs * this.delayScale
		try {
			this.isRunning = true
			// The player's code sits in its own block so it may redeclare the pin names.
			await Function(`
				'use strict'
				const { delay, g_has, g_get, g_set, print, read, write } = this
				${PRELUDE}
				{
				${
				this.code
					.replace('function loop()', 'async function loop()')
					.replace(/\bdelay\s*\(/g, 'await delay(')
			}
				;return loop()
				}
			`).bind({
				delay(ticks: number) {
					return new Promise<void>((resolve) =>
						engine.clock.schedule(resolve, ticks * delayMs)
					)
				},
				g_has(name: string) {
					return name in globals
				},
				g_get(name: string) {
					return globals[name]
				},
				g_set(name: string, value: any) {
					globals[name] = value
					if (isCurrent() && host.onGlobalSet) {
						host.onGlobalSet()
					}
				},
				print(...args: any[]) {
					if (isCurrent()) {
						host.print(args.join(' '))
					}
				},
				read(pin: number) {
					return isCurrent() ? host.read(pin) : 0
				},
				write(pin: number, value: number) {
					if (isCurrent()) {
						host.write(pin, value)
					}
				},
			})()
		} catch (e) {
			if (isCurrent()) {
				host.print(`${e}`)
			}
		} finally {
			if (isCurrent()) {
				this.isRunning = false
			}
		}
	}
}
