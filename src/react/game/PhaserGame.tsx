import { useEffect, useRef } from 'react'
import type Phaser from 'phaser'
import { bridge, inputState } from '../../game/bridge'

interface Props {
  avatar: string
  coins: number
  carrots: number
  onExit: () => void
}

// Phaser 게임을 마운트하는 React 컴포넌트. Phaser는 동적 import 되어 별도 청크로 빠진다.
export function PhaserGame({ avatar, coins, carrots, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    let destroyed = false
    import('../../game/main').then(({ createGame }) => {
      if (destroyed || !containerRef.current) return
      gameRef.current = createGame(containerRef.current, { avatar, coins, carrots })
    })
    const onExitEv = () => onExit()
    bridge.on('phaser:exit', onExitEv)
    return () => {
      destroyed = true
      bridge.off('phaser:exit', onExitEv)
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // React에서 코인이 바뀌면 게임 HUD에 반영
  useEffect(() => {
    gameRef.current?.registry.set('coins', coins)
  }, [coins])

  function press(dx: number, dy: number) {
    inputState.dx = dx
    inputState.dy = dy
  }
  function release() {
    inputState.dx = 0
    inputState.dy = 0
  }

  return (
    <div className="phaser-screen">
      <div className="phaser-canvas" ref={containerRef} />
      <button className="phaser-exit" onClick={onExit}>
        ← 나가기
      </button>

      <div className="controls game-controls">
        <div className="dpad">
          <button className="dbtn up" onPointerDown={() => press(0, -1)} onPointerUp={release} onPointerLeave={release}>▲</button>
          <button className="dbtn left" onPointerDown={() => press(-1, 0)} onPointerUp={release} onPointerLeave={release}>◀</button>
          <button className="dbtn right" onPointerDown={() => press(1, 0)} onPointerUp={release} onPointerLeave={release}>▶</button>
          <button className="dbtn down" onPointerDown={() => press(0, 1)} onPointerUp={release} onPointerLeave={release}>▼</button>
        </div>
        <button className="abtn" onClick={() => bridge.emit('action')}>A</button>
      </div>
    </div>
  )
}
