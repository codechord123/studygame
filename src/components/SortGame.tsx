import { useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'
import { GameFrame } from './GameFrame'
import { CountdownIntro } from './CountdownIntro'
import { useRaf } from '../lib/useRaf'
import { computeScore } from '../game/gamification'
import { playCorrect, playWrong, playCombo, playWhoosh, vibrate } from '../lib/juice'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

interface Bin {
  key: string
  label: string
  emoji: string
}

const START_LIVES = 3
const BIN_EMOJI = ['🧺', '🗑️', '📦']

function correctKey(p: Problem): string {
  if (p.type === 'ox') return p.answer ? 'O' : 'X'
  const mc = p as MultipleChoiceProblem
  return mc.choices[mc.answer]
}

// 떨어지는 항목 카드를 좌우로 '조준'해 알맞은 바구니에 떨어뜨리는 아케이드 캐처.
export function SortGame({ problems, theme, onComplete, onExit }: Props) {
  const items = problems
  const bins = useMemo<Bin[]>(() => {
    if (!items.length) return []
    if (items[0].type === 'ox') {
      return [
        { key: 'O', label: '맞음', emoji: '⭕' },
        { key: 'X', label: '틀림', emoji: '❌' },
      ]
    }
    const seen: string[] = []
    for (const p of items) {
      if (p.type === 'multiple_choice') for (const c of p.choices) if (!seen.includes(c)) seen.push(c)
    }
    return seen.slice(0, 3).map((c, i) => ({ key: c, label: c, emoji: BIN_EMOJI[i] }))
  }, [items])

  const [qi, setQi] = useState(0)
  const [y, setY] = useState(0)
  const [x, setX] = useState(50) // 카드 가로 위치(%)
  const [lives, setLives] = useState(START_LIVES)
  const [combo, setCombo] = useState(0)
  const [gained, setGained] = useState(0)
  const [flash, setFlash] = useState<null | { ok: boolean; key: string; answer: string }>(null)
  const [fx, setFx] = useState<null | { key: number; pts: number; tag: string | null }>(null)
  const [armed, setArmed] = useState(false)

  const fxKey = useRef(0)
  const yRef = useRef(0)
  const xRef = useRef(50)
  const speedRef = useRef(20)
  const comboRef = useRef(0)
  const gainedRef = useRef(0)
  const livesRef = useRef(START_LIVES)
  const resultsRef = useRef<GameResult[]>([])
  const lockRef = useRef(false)
  const draggingRef = useRef(false)
  const fieldRef = useRef<HTMLDivElement | null>(null)

  const problem = items[qi]
  const playable = items.length >= 2 && bins.length >= 2
  const active = armed && playable && !flash && !!problem && livesRef.current > 0

  // 카드 x(드래그 범위 30~70%) → 바구니 인덱스로 균등 매핑
  const binFromX = (px: number) =>
    Math.max(0, Math.min(bins.length - 1, Math.floor(((px - 30) / 40.0001) * bins.length)))
  const aimIdx = binFromX(x)

  useRaf(active, (dt) => {
    yRef.current += speedRef.current * dt
    if (yRef.current >= 100) {
      resolve(bins[binFromX(xRef.current)].key) // 바닥 도달 = 조준한 바구니로 투입
      return
    }
    setY(yRef.current)
  })

  if (!playable) {
    if (!lockRef.current) {
      lockRef.current = true
      window.setTimeout(() => onComplete([]), 0)
    }
    return (
      <GameFrame theme={theme} className="sort-game" onExit={onExit}>
        <p className="sort-empty">이 단원은 분류 게임에 맞는 문제가 아직 없어요. 다른 게임을 즐겨요!</p>
      </GameFrame>
    )
  }

  function steer(clientX: number) {
    const el = fieldRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pct = Math.max(30, Math.min(70, ((clientX - r.left) / r.width) * 100))
    xRef.current = pct
    setX(pct)
  }

  function resolve(binKey: string | null) {
    if (lockRef.current || !problem) return
    lockRef.current = true
    draggingRef.current = false
    const want = correctKey(problem)
    const ok = binKey != null && binKey === want
    let pts = 0
    if (ok) {
      comboRef.current += 1
      pts = computeScore({ basePoints: problem.points, combo: comboRef.current })
      gainedRef.current += pts
      speedRef.current = Math.min(36, speedRef.current + 1.6)
      fxKey.current += 1
      setFx({ key: fxKey.current, pts, tag: comboRef.current >= 2 ? `🔥 ${comboRef.current} 연속` : null })
      comboRef.current >= 2 ? playCombo(comboRef.current) : playCorrect()
      vibrate(20)
    } else {
      comboRef.current = 0
      livesRef.current -= 1
      speedRef.current = Math.max(18, speedRef.current - 1)
      playWrong()
      vibrate([40, 30, 40])
    }
    setCombo(comboRef.current)
    setGained(gainedRef.current)
    setLives(livesRef.current)
    resultsRef.current = [...resultsRef.current, { id: problem.id, correct: ok }]
    setFlash({ ok, key: binKey ?? '', answer: bins.find((b) => b.key === want)?.label ?? want })

    window.setTimeout(() => {
      if (livesRef.current <= 0 || qi + 1 >= items.length) {
        onComplete(resultsRef.current)
        return
      }
      yRef.current = 0
      setY(0)
      xRef.current = 50
      setX(50)
      setFlash(null)
      setFx(null)
      setQi(qi + 1)
      lockRef.current = false
    }, 850)
  }

  const solved = resultsRef.current.length
  const tilt = (x - 50) * 0.3 // 조준 방향으로 살짝 기울기

  return (
    <GameFrame
      theme={theme}
      className="sort-game"
      onExit={onExit}
      progress={`${Math.min(solved + 1, items.length)} / ${items.length}`}
      combo={combo}
      lives={lives}
    >
      {!armed && <CountdownIntro onDone={() => setArmed(true)} />}
      <p className="sort-hint">💎 {gained} · 카드를 끌어 알맞은 바구니 위로!</p>

      <div
        ref={fieldRef}
        className={`sort-arena ${!flash && y > 70 ? 'danger' : ''}`}
        onPointerDown={(e) => { if (!flash) { draggingRef.current = true; steer(e.clientX) } }}
        onPointerMove={(e) => { if (draggingRef.current) steer(e.clientX) }}
        onPointerUp={() => { draggingRef.current = false }}
        onPointerLeave={() => { draggingRef.current = false }}
      >
        <div className="bt-stars" aria-hidden />
        {/* 조준선 */}
        {!flash && <div className="sort-aim" style={{ left: `${x}%` }} aria-hidden />}

        {!flash && problem && (
          <div
            className={`sort-item ${y > 70 ? 'urgent' : ''}`}
            style={{ top: `${y}%`, left: `${x}%`, transform: `translateX(-50%) rotate(${tilt}deg)` }}
          >
            {problem.prompt.replace(/\{\{\d+\}\}/g, '___')}
          </div>
        )}
        {fx && (
          <div key={fx.key} className="fx-pop" aria-hidden>
            <span className="fx-pts">+{fx.pts}</span>
            {fx.tag && <span className="fx-tag">{fx.tag}</span>}
          </div>
        )}
        {flash && (
          <div className={`sort-flash ${flash.ok ? 'good' : 'bad'}`}>
            {flash.ok ? '정답! 🎉' : `아쉬워요 — ${flash.answer}`}
          </div>
        )}
      </div>

      <div className="sort-bins" data-n={bins.length}>
        {bins.map((b, i) => {
          const aiming = !flash && i === aimIdx
          const hit = flash && flash.key === b.key
          return (
            <button
              key={b.key}
              className={`sort-bin bin-${i} ${aiming ? 'aim' : ''} ${hit ? (flash!.ok ? 'hit-ok' : 'hit-no') : ''}`}
              disabled={!!flash}
              onPointerDown={() => { playWhoosh(); resolve(b.key) }}
            >
              <span className="bin-emoji">{b.emoji}</span>
              <span className="bin-label">{b.label}</span>
            </button>
          )
        })}
      </div>
    </GameFrame>
  )
}
