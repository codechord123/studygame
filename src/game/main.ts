import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { WorldScene } from './scenes/WorldScene'
import { UIScene } from './scenes/UIScene'

export interface GameInit {
  avatar: string
  coins: number
  carrots: number
}

export function createGame(parent: HTMLElement, init: GameInit): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 360,
    height: parent.clientHeight || 480,
    backgroundColor: '#6fb06b',
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [BootScene, WorldScene, UIScene],
  })
  game.registry.set('avatar', init.avatar)
  game.registry.set('coins', init.coins)
  game.registry.set('carrots', init.carrots)
  return game
}
