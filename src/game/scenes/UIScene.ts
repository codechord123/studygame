import Phaser from 'phaser'

// 항상 떠 있는 HUD: 벨(코인)·당근 인벤토리. 메인 카메라와 별개로 고정.
export class UIScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text

  constructor() {
    super('UI')
  }

  create() {
    this.label = this.add
      .text(12, 10, '', { fontSize: '15px', color: '#ffffff', backgroundColor: '#1b2147cc', padding: { x: 10, y: 6 } })
      .setScrollFactor(0)
      .setDepth(100)
    this.refresh()
    this.registry.events.on('changedata', this.refresh, this)
    this.events.once('shutdown', () => this.registry.events.off('changedata', this.refresh, this))
  }

  private refresh() {
    const coins = (this.registry.get('coins') as number) || 0
    const carrots = (this.registry.get('carrots') as number) || 0
    this.label.setText(`🔔 ${coins}   🥕 ${carrots}`)
  }
}
