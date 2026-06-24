import { useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'
import { GameFrame } from './GameFrame'
import { useRaf } from '../lib/useRaf'
import { computeScore } from '../game/gamification'
import { playCorrect, playWrong, playCombo } from '../lib/sfx'

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
const BIN_EMOJI = ['🟦', '🟨', '🟩']

function correctKey(p: Problem): string {
  if (p.type === 'ox') return p.answer ? 'O' : 'X'
  const mc = p as MultipleChoiceProblem
  return mc.choices[mc.answer]
}

// 떨어지는 항목 카드를 알맞은 '바구니'로 분류한다. 바구니는 한 판 내내 고정(안정적 범주).
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
  const [lives, setLives] = useState(START_LIVES)
  const [combo, setCombo] = useState(0)
  const [gained, setGained] = useState(0)
  const [flash, setFlash] = useState<null | { ok: boolean; key: string; answer: string }>(null)

  const yRef = useRef(0)
  const speedRef = useRef(20)
  const comboRef = useRef(0)
  const gainedRef = useRef(0)
  const livesRef = useRef(START_LIVES)
  const resultsRef = useRef<GameResult[]>([])
  const lockRef = useRef(false)

  const problem = items[qi]
  const playable = items.length >= 2 && bins.length >= 2
  const active = playable && !flash && !!problem && livesRef.current > 0

  useRaf(active, (dt) => {
    // 매 프레임 낙하 — dt(초) 기반이라 화면 주사율과 무관
    yRef.current += speedRef.current * dt
    if (yRef.current >= 100) {
      resolve(null) // 바닥에 닿음 = 놓침
      return
    }
    setY(yRef.current)
  })

  // 분류 불가능한 단원: 즉시 종료 (Empty State 방어)
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

  function resolve(binKey: string | null) {
    if (lockRef.current || !problem) return
    lockRef.current = true
    const want = correctKey(problem)
    const ok = binKey != null && binKey === want
    let pts = 0
    if (ok) {
      comboRef.current += 1
      pts = computeScore({ basePoints: problem.points, combo: comboRef.current })
      gainedRef.current += pts
      speedRef.current = Math.min(34, speedRef.current + 1.5)
      comboRef.current >= 2 ? playCombo(comboRef.current) : playCorrect()
    } else {
      comboRef.current = 0
      livesRef.current -= 1
      speedRef.current = Math.max(18, speedRef.current - 1)
      playWrong()
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
      setFlash(null)
      setQi(qi + 1)
      lockRef.current = false
    }, 850)
  }

  const solved = resultsRef.current.length

  return (
    <GameFrame
      theme={theme}
      className="sort-game"
      onExit={onExit}
      progress={`${Math.min(solved + 1, items.length)} / ${items.length}`}
      combo={combo}
      lives={lives}
    >
      <p className="sort-hint">💎 {gained} · 카드를 알맞은 바구니로 옮겨요!</p>

      <div className="sort-field">
        {!flash && problem && (
          <div className="sort-item" style={{ top: `${y}%` }}>
            {problem.prompt.replace(/\{\{\d+\}\}/g, '___')}
          </div>
        )}
        {flash && (
          <div className={`sort-flash ${flash.ok ? 'good' : 'bad'}`}>
            {flash.ok ? '정답! 🎉' : `아쉬워요 — ${flash.answer}`}
          </div>
        )}
      </div>

      <div className="sort-bins" data-n={bins.length}>
        {bins.map((b, i) => (
          <button
            key={b.key}
            className={`sort-bin bin-${i} ${flash && flash.key === b.key ? (flash.ok ? 'hit-ok' : 'hit-no') : ''}`}
            disabled={!!flash}
            onClick={() => resolve(b.key)}
          >
            <span className="bin-emoji">{b.emoji}</span>
            <span className="bin-label">{b.label}</span>
          </button>
        ))}
      </div>
    </GameFrame>
  )
}
