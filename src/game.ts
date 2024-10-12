import * as ex from 'excalibur';
import { Ship } from './actors/ship';
import { HealthBar } from './actors/health-bar';

import { stats } from './stats';
import { Baddie } from './actors/baddie';
import Config from './config';

import { animManager } from './actors/animation-manager';
export class Game extends ex.Scene {
    random = new ex.Random(1337); // seeded random

    constructor() {
        super();
    }

    onInitialize(engine: ex.Engine) {
        engine.add(animManager);

        const ship = new Ship(engine.halfDrawWidth, 800, 80, 80);
        engine.add(ship);

        const healthBar = new HealthBar();
        engine.add(healthBar);

        const scoreLabel = new ex.Label({
            text: "Score: " + stats.score,
            pos: ex.vec(80, 50)
        });
        scoreLabel.font.quality = 4;
        scoreLabel.font.size = 30;
        scoreLabel.font.unit = ex.FontUnit.Px;
        scoreLabel.font.family = "Open Sans";
        scoreLabel.transform.coordPlane = ex.CoordPlane.Screen;
        scoreLabel.color = ex.Color.Azure;
        scoreLabel.on('preupdate', (evt) => {
            scoreLabel.text = "Score: " + stats.score;
        });
        engine.add(scoreLabel);


        const gameOverLabel = new ex.Label({text:"Game Over", pos: ex.vec(engine.halfDrawWidth - 250, engine.halfDrawHeight) });
        gameOverLabel.font.quality = 4;
        gameOverLabel.font.size = 60;
        gameOverLabel.color = ex.Color.Green.clone();
        gameOverLabel.scale = new ex.Vector(2, 2);
        gameOverLabel.actions.repeatForever(ctx => ctx.blink(1000, 1000, 400));



        let baddieTimer = new ex.Timer({
            fcn: () => {
                var bad = new Baddie(this.random.floating(this.camera.viewport.left, this.camera.viewport.right), -100, 80, 80);
                engine.add(bad);
            },
            interval: Config.spawnTime,
            repeats: true,
            numberOfRepeats: -1
        });

        engine.addTimer(baddieTimer);
        baddieTimer.start();

        engine.on('preupdate', () => {
            if (stats.gameOver) {
                engine.add(gameOverLabel);
            }
        });

    }

}