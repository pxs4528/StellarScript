import * as ex from 'excalibur';
import { Ship } from './actors/ship';
import Config from './config';
import { animManager } from './actors/animation-manager';
import { Console } from './actors/console';

export class Sandbox extends ex.Scene {
    constructor() {
        super()
    }

    
    onInitialize(engine: ex.Engine) {
        engine.add(animManager);

        const ship = new Ship(engine.halfDrawWidth, 800, 80, 80);
        engine.add(ship);
        

    }
}