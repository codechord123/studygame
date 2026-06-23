import Phaser from 'phaser'
import { TILE } from './BootScene'
import { bridge, inputState } from '../bridge'

const COLS = 24
const ROWS = 22
const SPEED = 150

type FacilityType = 'shop' | 'missions' | 'ranking' | 'wrong' | 'room'

interface Interactable {
  x: number
  y: number
  type: 'facility' | 'villager' | 'plot'
  label: string
  facility?: FacilityType
  villagerId?: string
  plotId?: string
  subject?: string
  obj?: Phaser.GameObjects.Text
  ready?: boolean
}

const px = (t: number) => t * TILE + TILE / 2

// 마을(남) + 숲(북) + 가운데 강/다리로 나뉜 하나의 월드.
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Body & { go?: Phaser.GameObjects.Text }
  private playerObj!: Phaser.GameObjects.Text
  private obstacles!: Phaser.Physics.Arcade.StaticGroup
  private buildingBlocks: Phaser.GameObjects.GameObject[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private interactables: Interactable[] = []
  private prompt!: Phaser.GameObjects.Container
  private near: Interactable | null = null

  constructor() {
    super('World')
  }

  create() {
    this.obstacles = this.physics.add.staticGroup()
    this.buildTerrain()
    this.placeBuildings()
    this.placeVillagers()
    this.placePlots()
    this.createPlayer()
    this.createPrompt()

    this.physics.world.setBounds(0, 0, COLS * TILE, ROWS * TILE)
    this.cameras.main.setBounds(0, 0, COLS * TILE, ROWS * TILE)
    this.cameras.main.startFollow(this.playerObj, true, 0.12, 0.12)
    this.cameras.main.setZoom(1)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as Record<string, Phaser.Input.Keyboard.Key>
    this.input.keyboard!.on('keydown-SPACE', () => this.doInteract())
    bridge.on('action', this.doInteract, this)
    bridge.on('react:reward', this.onReward, this)

    this.events.once('shutdown', () => {
      bridge.off('action', this.doInteract, this)
      bridge.off('react:reward', this.onReward, this)
    })
  }

  // ── 지형 ──
  private buildTerrain() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const border = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1
        const river = y === 10 && x > 0 && x < COLS - 1
        const isBridge = river && (x === 11 || x === 12)
        const forest = y < 10
        if (border) {
          this.obstacles.create(px(x), px(y), 'tree')
        } else if (river && !isBridge) {
          this.obstacles.create(px(x), px(y), 'water')
        } else if (isBridge) {
          this.add.image(px(x), px(y), 'bridge')
        } else {
          const base = (x + y) % 2 === 0 ? 'grass' : 'grass2'
          this.add.image(px(x), px(y), base)
          // 숲엔 나무 듬성듬성
          if (forest && Math.random() < 0.12 && !this.isPlotSpot(x, y)) {
            this.obstacles.create(px(x), px(y), 'tree')
          }
        }
      }
    }
  }

  private isPlotSpot(x: number, y: number): boolean {
    return PLOTS.some((p) => p.x === x && p.y === y)
  }

  // ── 시설(충돌 + 상호작용) ──
  private placeBuildings() {
    BUILDINGS.forEach((b) => {
      this.add.image(px(b.x), px(b.y), 'soil').setAlpha(0.0) // 자리(투명)
      const icon = this.add.text(px(b.x), px(b.y) - 4, b.emoji, { fontSize: '30px' }).setOrigin(0.5).setDepth(5)
      this.add.text(px(b.x), px(b.y) + 18, b.label, { fontSize: '10px', color: '#1b2147', backgroundColor: '#ffffffcc' })
        .setOrigin(0.5)
        .setPadding(3, 1, 3, 1)
        .setDepth(5)
      // 충돌 바디 (정적). StaticGroup 대신 개별 충돌로 분리해 안정성 확보.
      const block = this.add.rectangle(px(b.x), px(b.y), TILE, TILE).setVisible(false)
      this.physics.add.existing(block, true)
      this.buildingBlocks.push(block)
      this.interactables.push({ x: b.x, y: b.y, type: 'facility', facility: b.facility, label: b.label, obj: icon })
    })
  }

  // ── 주민 ──
  private placeVillagers() {
    VILLAGER_NPCS.forEach((v) => {
      const t = this.add.text(px(v.x), px(v.y), v.emoji, { fontSize: '28px' }).setOrigin(0.5).setDepth(5)
      this.add.text(px(v.x), px(v.y) + 16, v.name, { fontSize: '10px', color: '#1b2147', backgroundColor: '#ffffffcc' })
        .setOrigin(0.5)
        .setPadding(3, 1, 3, 1)
        .setDepth(5)
      this.tweens.add({ targets: t, y: t.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
      this.interactables.push({ x: v.x, y: v.y, type: 'villager', villagerId: v.id, label: v.name, obj: t })
    })
  }

  // ── 채집밭 ──
  private placePlots() {
    PLOTS.forEach((p, i) => {
      this.add.image(px(p.x), px(p.y), 'soil')
      const crop = this.add.text(px(p.x), px(p.y) - 2, '🥕', { fontSize: '26px' }).setOrigin(0.5).setDepth(4)
      this.interactables.push({
        x: p.x,
        y: p.y,
        type: 'plot',
        plotId: 'plot-' + i,
        subject: p.subject,
        label: p.subject + ' 밭',
        obj: crop,
        ready: true,
      })
    })
  }

  private createPlayer() {
    const avatar = (this.registry.get('avatar') as string) || '🐱'
    const spawn = { x: 12, y: 15 }
    this.playerObj = this.add.text(px(spawn.x), px(spawn.y), avatar, { fontSize: '30px' }).setOrigin(0.5).setDepth(10)
    this.physics.add.existing(this.playerObj)
    this.player = this.playerObj.body as Phaser.Physics.Arcade.Body & { go?: Phaser.GameObjects.Text }
    this.player.setSize(24, 24)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.playerObj, this.obstacles)
    this.physics.add.collider(this.playerObj, this.buildingBlocks)
  }

  private createPrompt() {
    const bg = this.add.text(0, 0, '', {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#1b2147',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5)
    this.prompt = this.add.container(0, 0, [bg]).setDepth(30).setVisible(false)
    ;(this.prompt as unknown as { _bg: Phaser.GameObjects.Text })._bg = bg
  }

  update() {
    // 입력
    let dx = 0
    let dy = 0
    if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1
    else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1
    if (this.cursors.up.isDown || this.keys.W.isDown) dy = -1
    else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1
    if (dx === 0 && dy === 0) {
      dx = inputState.dx
      dy = inputState.dy
    }
    const len = Math.hypot(dx, dy) || 1
    this.player.setVelocity((dx / len) * SPEED, (dy / len) * SPEED)
    if (dx < 0) this.playerObj.setScale(-1, 1)
    else if (dx > 0) this.playerObj.setScale(1, 1)

    // 가장 가까운 상호작용 대상
    let best: Interactable | null = null
    let bestD = 1.4 * TILE
    for (const it of this.interactables) {
      if (it.type === 'plot' && !it.ready) continue
      const d = Phaser.Math.Distance.Between(this.playerObj.x, this.playerObj.y, px(it.x), px(it.y))
      if (d < bestD) {
        bestD = d
        best = it
      }
    }
    this.near = best
    const bg = (this.prompt as unknown as { _bg: Phaser.GameObjects.Text })._bg
    if (best) {
      this.prompt.setVisible(true).setPosition(px(best.x), px(best.y) - 30)
      bg.setText(
        best.type === 'plot' ? `Ⓐ ${best.label} 캐기` : best.type === 'villager' ? `Ⓐ ${best.label}` : `Ⓐ ${best.label}`,
      )
    } else {
      this.prompt.setVisible(false)
    }
  }

  private doInteract() {
    const it = this.near
    if (!it) return
    if (it.type === 'facility' && it.facility) bridge.emit('phaser:ui', { type: it.facility })
    else if (it.type === 'villager' && it.villagerId) bridge.emit('phaser:villager', { id: it.villagerId })
    else if (it.type === 'plot' && it.ready) {
      bridge.emit('phaser:harvest', { plotId: it.plotId, subject: it.subject })
    }
  }

  private onReward(data: { plotId: string; correct: number; total: number }) {
    const it = this.interactables.find((i) => i.plotId === data.plotId)
    if (!it || !it.obj) return
    const success = data.total > 0 && data.correct / data.total >= 0.5
    if (success) {
      // 수확량 = 맞힌 수
      const carrots = (this.registry.get('carrots') as number) || 0
      this.registry.set('carrots', carrots + data.correct)
      it.ready = false
      it.obj.setText('🟫').setAlpha(0.6)
      // 리스폰
      this.time.delayedCall(8000, () => {
        it.ready = true
        it.obj!.setText('🥕').setAlpha(1)
      })
      // 수확 팝업
      const pop = this.add.text(px(it.x), px(it.y) - 20, `+${data.correct}🥕`, { fontSize: '16px', color: '#ffd166' }).setOrigin(0.5).setDepth(40)
      this.tweens.add({ targets: pop, y: pop.y - 24, alpha: 0, duration: 1000, onComplete: () => pop.destroy() })
    }
  }
}

// ── 배치 좌표 ──
const BUILDINGS: { facility: FacilityType; emoji: string; label: string; x: number; y: number }[] = [
  { facility: 'shop', emoji: '🏪', label: '상점', x: 4, y: 14 },
  { facility: 'missions', emoji: '📋', label: '게시판', x: 8, y: 14 },
  { facility: 'ranking', emoji: '⭐', label: '명예의별', x: 16, y: 14 },
  { facility: 'wrong', emoji: '📕', label: '오답노트', x: 20, y: 14 },
  { facility: 'room', emoji: '🏠', label: '내 집', x: 12, y: 19 },
]
const VILLAGER_NPCS: { id: string; emoji: string; name: string; x: number; y: number }[] = [
  { id: 'math', emoji: '🦝', name: '셈돌이', x: 6, y: 17 },
  { id: 'korean', emoji: '🦉', name: '글봄', x: 10, y: 17 },
  { id: 'social', emoji: '🦊', name: '누리', x: 16, y: 17 },
  { id: 'science', emoji: '🐢', name: '바위', x: 19, y: 18 },
]
const PLOTS: { x: number; y: number; subject: string }[] = [
  { x: 4, y: 3, subject: 'math' },
  { x: 8, y: 4, subject: 'korean' },
  { x: 14, y: 3, subject: 'social' },
  { x: 18, y: 5, subject: 'science' },
  { x: 6, y: 7, subject: 'math' },
  { x: 16, y: 7, subject: 'science' },
]
