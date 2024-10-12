import * as ex from "excalibur";
import { gameSheet, Sounds, explosionSpriteSheet } from "../resources";
import Config from "../config";
import { Bullet } from "./bullet";
import { Baddie } from "./baddie";
import { animManager } from "./animation-manager";
import { stats } from "../stats";

type FireFunction = (engine: ex.Engine) => void;
const throttle = function(this: any, func: FireFunction, throttle: number): FireFunction {
    var lastTime = Date.now();
    var throttle = throttle;
    return (engine: ex.Engine) => {
       var currentTime = Date.now();
       if(currentTime - lastTime > throttle){
          var val = func.apply(this, [engine]);
          lastTime = currentTime;
          return val;
       }
    }
 }

export class Ship extends ex.Actor {
    static group = ex.CollisionGroupManager.create('player');
    private flipBarrel = false;
    private throttleFire?: FireFunction;
    private explode?: ex.Animation;
    constructor(x: number, y: number, width: number, height: number) {
        super({
            pos: new ex.Vector(x, y),
            width: width,
            height: height,
        });

        this.body.collisionType = ex.CollisionType.Passive;
        // Player group does not collide with itself
        this.body.group = Ship.group;
    }

    onInitialize(engine: ex.Engine) {
        this.throttleFire = throttle(this.fire, Config.playerFireThrottle);
        this.on('precollision', (evt) => this.onPreCollision(evt));

        // Keyboard
        engine.input.keyboard.on('hold', (evt) => this.handleKeyEvent(engine, evt));
        engine.input.keyboard.on('release', (evt: ex.Input.KeyEvent) => { 
            if(evt.key !== ex.Input.Keys.Space) {
                this.vel = ex.Vector.Zero.clone()
            }
         });

        // Pointer
        engine.input.pointers.primary.on('down', (evt) => this.handlePointerEvent(engine, evt));
        engine.input.pointers.primary.on('up', () => this.vel = ex.Vector.Zero.clone());

        // Get animation
        const anim = ex.Animation.fromSpriteSheet(gameSheet, [0, 1, 2], 100, ex.AnimationStrategy.Loop);
        anim.scale = new ex.Vector(4, 4);
        this.graphics.use(anim);

        this.explode = ex.Animation.fromSpriteSheet(explosionSpriteSheet, ex.range(0, explosionSpriteSheet.sprites.length - 1), 40, ex.AnimationStrategy.End);
        this.explode.scale = new ex.Vector(3, 3);
    }

    onPreCollision(evt: ex.PreCollisionEvent) {
        if(evt.other instanceof Baddie || ex.Util.contains(Baddie.Bullets, evt.other)){
            Sounds.hitSound.play();
            this.actions.blink(300, 300, 3);
            stats.hp -= Config.enemyDamage;
            if (stats.hp <= 0) {
                stats.gameOver = true;
                this.kill();
                this.stopRegisteringFireThrottleEvent();
            }
         }
    }

    private stopRegisteringFireThrottleEvent = () => {
        this.throttleFire = undefined;
    }

    onPostUpdate(engine: ex.Engine, delta: number) {
        if (stats.hp <= 0 && this.explode) {
            // update game to display game over
            // gameOver = true;
            animManager.play(this.explode, this.pos);
            Sounds.explodeSound.play();
            this.kill();
         }

        // Keep player in the viewport
       if(this.pos.x < 0) this.pos.x = 0;
       if(this.pos.y < 0) this.pos.y = 0;
       if(this.pos.x > engine.drawWidth - this.width) this.pos.x = (engine.drawWidth - this.width);
       if(this.pos.y > engine.drawHeight - this.height) this.pos.y = (engine.drawHeight - this.height);
    }

    private fire = (engine: ex.Engine) => {
        let bullet = new Bullet(this.pos.x + (this.flipBarrel?-40:40), this.pos.y - 20, 0, Config.playerBulletVelocity, Ship.group);
        this.flipBarrel = !this.flipBarrel;
        Sounds.laserSound.play();
        engine.add(bullet);
    }

    handlePointerEvent = (engine: ex.Engine, evt: ex.Input.PointerEvent) => {
        let dir = evt.worldPos.sub(this.pos);
        let distance = dir.size;
        if (distance > 50) {
            this.vel = dir.scale(Config.playerSpeed/distance);
        } else {
            this.throttleFire ? this.throttleFire(engine) : null;
        }
    }

    handleKeyEvent = (engine: ex.Engine, evt: ex.Input.KeyEvent) => {
        let dir = ex.Vector.Zero.clone();

        if (evt.key === ex.Input.Keys.Space) {
            this.throttleFire ? this.throttleFire(engine) : null;
            if (this.vel.x !== 0 || this.vel.y !== 0) {
                dir = this.vel.normalize();
            }
        }
        // Some keys do the same thing
        if (evt.key === ex.Input.Keys.Up ||
            evt.key === ex.Input.Keys.W) {
            dir.y += -1;
        }

        if (evt.key === ex.Input.Keys.Left ||
            evt.key === ex.Input.Keys.A) {
            dir.x += -1;
        }

        if (evt.key === ex.Input.Keys.Right ||
            evt.key === ex.Input.Keys.D) {
            dir.x += 1;
        }

        if (evt.key === ex.Input.Keys.Down ||
            evt.key ===  ex.Input.Keys.S) {
            dir.y += 1;
        }

        if (dir.x !== 0 || dir.y !== 0) {
            this.vel = dir.normalize().scale(Config.playerSpeed);
        }
    }
}

