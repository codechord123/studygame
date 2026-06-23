import Phaser from 'phaser'

export const TILE = 40

// 코드로 생성한 플레이스홀더 타일/스프라이트 텍스처.
// ⬇️ 진짜 아트(Sprout Lands·Kenney 등)를 쓸 땐 이 씬의 generate* 대신
//    this.load.image/spritesheet(...) 로 교체하면 나머지 코드는 그대로 동작한다.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create() {
    this.tile('grass', '#6fb06b', '#67a863')
    this.tile('grass2', '#6cab68', '#64a45f')
    this.tile('path', '#d9c08a', '#cdb47e')
    this.tile('soil', '#7a5a3a', '#6b4e32')
    this.tile('water', '#5aa9e6', '#4f9ad6')
    this.tile('bridge', '#b07b46', '#9c6c3c')
    this.treeTexture()
    this.roundIcon('plot', '#8a5a36')
    this.scene.start('World')
    this.scene.launch('UI')
  }

  private tile(key: string, c1: string, c2: string) {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(Phaser.Display.Color.HexStringToColor(c1).color, 1)
    g.fillRect(0, 0, TILE, TILE)
    g.fillStyle(Phaser.Display.Color.HexStringToColor(c2).color, 1)
    // 격자 무늬
    g.fillRect(0, 0, TILE / 2, TILE / 2)
    g.fillRect(TILE / 2, TILE / 2, TILE / 2, TILE / 2)
    g.generateTexture(key, TILE, TILE)
    g.destroy()
  }

  private treeTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0x67a863, 1)
    g.fillRect(0, 0, TILE, TILE)
    g.fillStyle(0x6b4e32, 1)
    g.fillRect(TILE / 2 - 3, TILE - 12, 6, 12) // 줄기
    g.fillStyle(0x2f7d4f, 1)
    g.fillCircle(TILE / 2, TILE / 2 - 2, TILE / 2 - 4) // 잎
    g.fillStyle(0x3a9160, 1)
    g.fillCircle(TILE / 2 - 5, TILE / 2 - 6, 7)
    g.generateTexture('tree', TILE, TILE)
    g.destroy()
  }

  private roundIcon(key: string, color: string) {
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1)
    g.fillRoundedRect(4, 4, TILE - 8, TILE - 8, 8)
    g.generateTexture(key, TILE, TILE)
    g.destroy()
  }
}
