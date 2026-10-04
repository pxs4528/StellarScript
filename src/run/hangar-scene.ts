import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/theme-github_dark'
import ace from 'ace-builds'
import * as ex from 'excalibur'
import { JokerIcons, PartIcons, RepairIcon, UpgradeIcons } from './art'
import { EncounterScene } from './encounter-scene'
import { BOSS_RULES, ENCOUNTERS_PER_SYSTEM, planEncounter } from './encounters'
import {
	MAX_UPGRADE_LEVEL,
	PartId,
	PARTS,
	REPAIR_HULL,
	REPAIR_PRICE,
	upgradeCost,
	UpgradeId,
	UPGRADES,
} from './hardware'
import {
	CODE_GOLF_MAX_LINES,
	countCodeLines,
	JokerId,
	JOKERS,
	MAX_JOKERS,
	sellPrice,
	TECHNICAL_DEBT_CREDITS,
} from './jokers'
import { run } from './run-state'
import './run.css'

const rootDiv = document.getElementById('rootDiv') as HTMLDivElement

const JOKER_OFFERS = 2
const UPGRADE_OFFERS = 2
const PART_OFFER_CHANCE = 0.4
const REROLL_BASE_PRICE = 2

type Offer =
	& { sold: boolean }
	& (
		| { kind: 'joker'; id: JokerId }
		| { kind: 'upgrade'; id: UpgradeId }
		| { kind: 'part'; id: PartId }
		| { kind: 'repair' }
	)

interface OfferView {
	icon: string
	name: string
	text: string
	price: number
	// Why it cannot be bought right now, if it cannot.
	blocked?: string
}

function pickRandom<T>(items: T[], count: number): T[] {
	const pool = items.slice()
	const picked: T[] = []
	while (picked.length < count && pool.length > 0) {
		picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
	}
	return picked
}

export function launchEncounter(engine: ex.Engine) {
	if (engine.scenes['encounter']) {
		engine.removeScene('encounter')
	}
	engine.addScene('encounter', new EncounterScene())
	engine.goToScene('encounter')
}

// Between encounters: edit the script, spend credits, then launch.
export class HangarScene extends ex.Scene {
	private offers: Offer[] = []
	private rerolls = 0

	onActivate(context: ex.SceneActivationContext) {
		this.rerolls = 0
		this.offers = this.rollOffers()

		const plan = planEncounter(run.system, run.encounter)
		const rule = BOSS_RULES[run.bossRule]
		rootDiv.innerHTML = `
			<section id="hangar">
				<header>
					<h2>HANGAR</h2>
					<div id="hangar-next">
						NEXT: SYSTEM ${run.system} · ${run.encounter + 1}/${ENCOUNTERS_PER_SYSTEM} ·
						${plan.name.toUpperCase()} · SALVAGE TARGET ${plan.target}
					</div>
					<div id="hangar-rule">
						Boss of this system: ${rule.name}. ${rule.text}
					</div>
				</header>
				<div class="hangar-cols">
					<div class="hangar-code">
						<div id="editor"></div>
						<div id="hangar-lines"></div>
						<div id="hangar-pins"></div>
					</div>
					<div class="hangar-side">
						<div id="hangar-stats"></div>
						<h3>SHOP</h3>
						<div id="shop-offers"></div>
						<button id="shop-reroll" class="run-button yellow"></button>
						<h3 id="jokers-title"></h3>
						<div id="owned-jokers"></div>
						<h3>HARDWARE</h3>
						<div id="owned-hardware"></div>
					</div>
				</div>
				<footer>
					<button id="hangar-launch" class="run-button green">Launch</button>
					<button id="hangar-quit" class="run-button red">Abandon run</button>
				</footer>
			</section>
		`

		const editor = ace.edit('editor', { useWorker: false })
		editor.setTheme('ace/theme/github_dark')
		editor.session.setMode('ace/mode/javascript')
		editor.setValue(run.code, -1)
		editor.session.on('change', () => {
			run.code = editor.getValue()
			this.renderLineCount()
		})

		const side = rootDiv.querySelector('.hangar-side') as HTMLDivElement
		side.onclick = (event) => {
			const button = (event.target as HTMLElement).closest('button')
			if (!button || button.disabled) {
				return
			}
			if (button.dataset.buy !== undefined) {
				this.buy(Number(button.dataset.buy))
			} else if (button.dataset.sell !== undefined) {
				this.sell(button.dataset.sell as JokerId)
			} else if (button.id === 'shop-reroll') {
				this.reroll()
			}
		}

		const launchButton = document.getElementById('hangar-launch') as HTMLButtonElement
		launchButton.onclick = () => {
			run.code = editor.getValue()
			launchEncounter(context.engine)
		}
		const quitButton = document.getElementById('hangar-quit') as HTMLButtonElement
		quitButton.onclick = () => {
			context.engine.goToScene('mainmenu')
		}

		this.render()
	}

	onDeactivate() {
		rootDiv.innerHTML = ''
	}

	// ---- Shop ----

	private rollOffers(): Offer[] {
		const offers: Offer[] = []
		const jokerIds = (Object.keys(JOKERS) as JokerId[]).filter((id) => !run.hasJoker(id))
		for (const id of pickRandom(jokerIds, JOKER_OFFERS)) {
			offers.push({ kind: 'joker', id, sold: false })
		}
		const upgradeIds = (Object.keys(UPGRADES) as UpgradeId[])
			.filter((id) => run.upgrades[id] < MAX_UPGRADE_LEVEL)
		for (const id of pickRandom(upgradeIds, UPGRADE_OFFERS)) {
			offers.push({ kind: 'upgrade', id, sold: false })
		}
		const partIds = (Object.keys(PARTS) as PartId[]).filter((id) => !run.hasPart(id))
		if (partIds.length > 0 && Math.random() < PART_OFFER_CHANCE) {
			offers.push({ kind: 'part', id: pickRandom(partIds, 1)[0], sold: false })
		}
		offers.push({ kind: 'repair', sold: false })
		return offers
	}

	private get rerollPrice(): number {
		return REROLL_BASE_PRICE + this.rerolls
	}

	private describe(offer: Offer): OfferView {
		switch (offer.kind) {
			case 'joker': {
				const joker = JOKERS[offer.id]
				return {
					icon: JokerIcons[offer.id],
					name: joker.name,
					text: joker.text,
					price: joker.price,
					blocked: run.jokers.length >= MAX_JOKERS ? 'Slots full' : undefined,
				}
			}
			case 'upgrade': {
				const level = run.upgrades[offer.id]
				return {
					icon: UpgradeIcons[offer.id],
					name: `${UPGRADES[offer.id].name} Lv ${level + 1}`,
					text: UPGRADES[offer.id].text,
					price: upgradeCost(level),
				}
			}
			case 'part':
				return {
					icon: PartIcons[offer.id],
					name: PARTS[offer.id].name,
					text: PARTS[offer.id].text,
					price: PARTS[offer.id].price,
				}
			case 'repair':
				return {
					icon: RepairIcon,
					name: 'Hull repair',
					text: `Repair ${REPAIR_HULL} hull.`,
					price: REPAIR_PRICE,
					blocked: run.hull >= run.maxHull ? 'Hull full' : undefined,
				}
		}
	}

	private buy(index: number) {
		const offer = this.offers[index]
		if (!offer || offer.sold) {
			return
		}
		const view = this.describe(offer)
		if (view.blocked || run.credits < view.price) {
			return
		}
		run.credits -= view.price
		switch (offer.kind) {
			case 'joker':
				run.jokers.push(offer.id)
				if (offer.id === 'technical-debt') {
					run.credits += TECHNICAL_DEBT_CREDITS
				}
				offer.sold = true
				break
			case 'upgrade':
				run.upgrades[offer.id]++
				offer.sold = true
				break
			case 'part':
				run.parts.push(offer.id)
				offer.sold = true
				break
			case 'repair':
				// Repair can be bought again and again.
				run.repair(REPAIR_HULL)
				break
		}
		this.render()
	}

	private sell(id: JokerId) {
		if (!run.hasJoker(id) || !JOKERS[id].sellable) {
			return
		}
		run.jokers = run.jokers.filter((owned) => owned !== id)
		run.credits += sellPrice(id)
		this.render()
	}

	private reroll() {
		if (run.credits < this.rerollPrice) {
			return
		}
		run.credits -= this.rerollPrice
		this.rerolls++
		this.offers = this.rollOffers()
		this.render()
	}

	// ---- Rendering ----

	private render() {
		this.renderStats()
		this.renderOffers()
		this.renderOwned()
		this.renderLineCount()
		this.renderPins()
	}

	private renderStats() {
		const stats = document.getElementById('hangar-stats') as HTMLDivElement
		stats.innerHTML = `
			<span>HULL ${run.hull}/${run.maxHull}</span>
			<span class="credits">CREDITS ${run.credits}</span>
		`
	}

	private renderOffers() {
		const container = document.getElementById('shop-offers') as HTMLDivElement
		container.innerHTML = this.offers
			.map((offer, index) => {
				const view = this.describe(offer)
				let label = `Buy ${view.price}`
				let disabled = run.credits < view.price
				if (offer.sold) {
					label = 'Sold'
					disabled = true
				} else if (view.blocked) {
					label = view.blocked
					disabled = true
				}
				return `
					<div class="card ${offer.sold ? 'sold' : ''}">
						<img class="px-icon" src="${view.icon}" alt="">
						<div class="card-body">
							<strong>${view.name}</strong>
							<span>${view.text}</span>
						</div>
						<button class="run-button yellow" data-buy="${index}" ${
					disabled ? 'disabled' : ''
				}>
							${label}
						</button>
					</div>
				`
			})
			.join('')

		const rerollButton = document.getElementById('shop-reroll') as HTMLButtonElement
		rerollButton.textContent = `Reroll ${this.rerollPrice}`
		rerollButton.disabled = run.credits < this.rerollPrice
	}

	private renderOwned() {
		const title = document.getElementById('jokers-title') as HTMLHeadingElement
		title.textContent = `JOKERS ${run.jokers.length}/${MAX_JOKERS}`

		const jokers = document.getElementById('owned-jokers') as HTMLDivElement
		jokers.innerHTML = run.jokers.length === 0
			? '<p class="empty">None yet.</p>'
			: run.jokers
				.map((id) => {
					const joker = JOKERS[id]
					return `
						<div class="card">
							<img class="px-icon" src="${JokerIcons[id]}" alt="">
							<div class="card-body">
								<strong>${joker.name}</strong>
								<span>${joker.text}</span>
							</div>
							${
						joker.sellable
							? `<button class="run-button red" data-sell="${id}">Sell ${
								sellPrice(id)
							}</button>`
							: ''
					}
						</div>
					`
				})
				.join('')

		const hardware = document.getElementById('owned-hardware') as HTMLDivElement
		const upgrades = (Object.keys(UPGRADES) as UpgradeId[])
			.map((id) => `${UPGRADES[id].name} Lv ${run.upgrades[id]}`)
		const parts = run.parts.map((id) => PARTS[id].name)
		hardware.innerHTML = `<p>${upgrades.concat(parts).join(' · ')}</p>`
	}

	private renderLineCount() {
		const element = document.getElementById('hangar-lines')
		if (!element) {
			return
		}
		const lines = countCodeLines(run.code)
		const golf = run.hasJoker('code-golf')
			? lines <= CODE_GOLF_MAX_LINES ? ' · Code Golf active' : ' · Code Golf inactive'
			: ''
		element.textContent = `${lines} lines${golf}`
	}

	private renderPins() {
		const element = document.getElementById('hangar-pins') as HTMLDivElement
		const pins: [string, string][] = [
			['ENGINE_LEFT, ENGINE_RIGHT', 'write HIGH or LOW'],
			['SENSOR_LEFT, SENSOR_RIGHT', 'read 1 when something is ahead'],
			['WEAPON', 'write HIGH to fire'],
		]
		if (run.hasPart('radar')) {
			pins.push(['RADAR_BEARING, RADAR_DISTANCE', 'read the nearest contact'])
		}
		if (run.hasPart('shield')) {
			pins.push(['SHIELD', 'write HIGH to block damage, burns fuel'])
		}
		element.innerHTML = `
			<strong>PINS</strong>
			${pins.map(([name, use]) => `<div><code>${name}</code> ${use}</div>`).join('')}
			<div><code>delay(ticks) print(...) g_get g_set g_has</code></div>
		`
	}
}
