// Icons shown in the hangar and HUD. All of these are placeholders, see res/placeholder/README.md.
import jokerCodeGolf from '../../res/placeholder/joker-code-golf.png'
import jokerGarbageCollector from '../../res/placeholder/joker-garbage-collector.png'
import jokerHotPath from '../../res/placeholder/joker-hot-path.png'
import jokerOffByOne from '../../res/placeholder/joker-off-by-one.png'
import jokerPureFunction from '../../res/placeholder/joker-pure-function.png'
import jokerRaceCondition from '../../res/placeholder/joker-race-condition.png'
import jokerRubberDuck from '../../res/placeholder/joker-rubber-duck.png'
import jokerTechnicalDebt from '../../res/placeholder/joker-technical-debt.png'
import partRadar from '../../res/placeholder/part-radar.png'
import partShield from '../../res/placeholder/part-shield.png'
import serviceRepair from '../../res/placeholder/service-repair.png'
import upgradeCannon from '../../res/placeholder/upgrade-cannon.png'
import upgradeClock from '../../res/placeholder/upgrade-clock.png'
import upgradeGyros from '../../res/placeholder/upgrade-gyros.png'
import upgradeSensors from '../../res/placeholder/upgrade-sensors.png'
import upgradeThrusters from '../../res/placeholder/upgrade-thrusters.png'
import { PartId, UpgradeId } from './hardware'
import { JokerId } from './jokers'

export const JokerIcons: Record<JokerId, string> = {
	'code-golf': jokerCodeGolf,
	'pure-function': jokerPureFunction,
	'rubber-duck': jokerRubberDuck,
	'off-by-one': jokerOffByOne,
	'technical-debt': jokerTechnicalDebt,
	'race-condition': jokerRaceCondition,
	'garbage-collector': jokerGarbageCollector,
	'hot-path': jokerHotPath,
}

export const UpgradeIcons: Record<UpgradeId, string> = {
	sensors: upgradeSensors,
	cannon: upgradeCannon,
	thrusters: upgradeThrusters,
	gyros: upgradeGyros,
	clock: upgradeClock,
}

export const PartIcons: Record<PartId, string> = {
	radar: partRadar,
	shield: partShield,
}

export const RepairIcon: string = serviceRepair
