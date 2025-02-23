import { Game as MainGame } from './scenes/Game';
import { AUTO, Game, Scale, Types } from 'phaser';

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Scale.RESIZE,     
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        MainGame
    ]
};


export default new Game(config);
