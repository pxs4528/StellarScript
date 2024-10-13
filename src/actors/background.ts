import * as ex from 'excalibur'
import { Images } from '../resources'

export class Background extends ex.Actor {
	constructor(width: number, height: number) {
		super({
			pos: ex.Vector.Zero,
			width,
			height,
		})
		this.body.collisionType = ex.CollisionType.PreventCollision
	}

	onInitialize(engine: ex.Engine) {
		this.z = -999
		this.graphics.anchor = ex.Vector.Zero
		const sprite = Images.stars.toSprite()
		sprite.destSize.width = this.width
		sprite.destSize.height = this.height
		this.graphics.use(sprite)
	}
}
