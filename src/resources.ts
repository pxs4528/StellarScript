import * as ex from 'excalibur'

import enemyFile from '../res/enemy.png'
import enemyfireFile from '../res/enemyfire.wav'
import explodeFile from '../res/explode.wav'
import fighterFile from '../res/fighter.png'
import gameSheetFile from '../res/gameSheet.png'
import hitFile from '../res/hit.wav'
import laserFile from '../res/laser.wav'
import powerupFile from '../res/powerup.wav'
import rocketFile from '../res/rocket.wav'
import spriteexplosionFile from '../res/spriteexplosion.png'

const Images: { [key: string]: ex.ImageSource } = {
	fighter: new ex.ImageSource(fighterFile),
	enemyPink: new ex.ImageSource(enemyFile),
	explosion: new ex.ImageSource(spriteexplosionFile),
	sheet: new ex.ImageSource(gameSheetFile),
}

const Sounds: { [key: string]: ex.Sound } = {
	laserSound: new ex.Sound(laserFile),
	enemyFireSound: new ex.Sound(enemyfireFile),
	explodeSound: new ex.Sound(explodeFile),
	hitSound: new ex.Sound(hitFile),
	powerUp: new ex.Sound(powerupFile),
	rocketSound: new ex.Sound(rocketFile),
}

const explosionSpriteSheet = ex.SpriteSheet.fromImageSource({
	image: Images.explosion,
	grid: {
		rows: 5,
		columns: 5,
		spriteWidth: 45,
		spriteHeight: 45,
	},
})
const gameSheet = ex.SpriteSheet.fromImageSource({
	image: Images.sheet,
	grid: {
		rows: 10,
		columns: 10,
		spriteWidth: 32,
		spriteHeight: 32,
	},
})

const loader = new ex.Loader()
const allResources = { ...Images, ...Sounds }
for (const res in allResources) {
	loader.addResource(allResources[res])
}

export { explosionSpriteSheet, gameSheet, Images, loader, Sounds }
