import { useMemo, useRef, useState } from 'react'
import type { Problem } from '../types/problem'
import { correctAnswerText } from '../lib/grading'
import { playPop, playWrong, playCombo, playFlip } from '../lib/sfx'
import { computeScore } from '../game/gamification'
import { useRaf } from '../lib/useRaf'
import { GameFrame } from './GameFrame'
import type { GameResult } from './SpeedOxGame'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

interface Card {
  key: string
  pid: string
  side: 'q' | 'a'
  text: string
  points: number
}

function shortPrompt(p: Problem): string {
  const t = p.prompt.replace(/\{\{\d+\}\}/g, '___').replace(/\s+/g, ' ').trim()
  return t.length > 36 ? t.slice(0, 35) + '…' : t
}

function buildCards(problems: Problem[]): Card[] {
  const picked = problems.slice(0, 8) // 8쌍(16장) — 4×4
  const cards: Card[] = []
  picked.forEach((p) => {
    cards.push({ key: p.id + '-q', pid: p.id, side: 'q', text: shortPrompt(p), points: p.points })
    cards.push({ key: p.id + '-a', pid: p.id, side: 'a', text: correctAnswerText(p), points: p.points })
  })
  // 셔플
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

interface Fx {
  key: number
  pts: number
  tag: string | null
}

// 문제 카드와 답 카드를 짝지어 뒤집는 메모리 게임.
// 연속 매칭 콤보 · 빠를수록 고득점 · 시간/뒤집기 기록.
export function MemoryGame({ problems, theme, onComplete, onExit }: Props) {
  const cards = useMemo(() => buildCards(problems), [problems])
  const pairCount = cards.length / 2
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [missed, setMissed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [moves, setMoves] = useState(0)
  const [combo, setCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [shake, setShake] = useState(false)
  const [fx, setFx] = useState<Fx | null>(null)

  const comboRef = useRef(0)
  const elapsedRef = useRef(0)
  const fxKey = useRef(0)
  const done = matched.size >= pairCount

  useRaf(!done, (dt) => {
    elapsedRef.current += dt
    setElapsed(elapsedRef.current)
  })

  function finish(matchedSet: Set<string>, missedSet: Set<string>) {
    const ids = new Set(cards.map((c) => c.pid))
    const results: GameResult[] = [...ids].map((id) => ({ id, correct: !missedSet.has(id) }))
    void matchedSet
    window.setTimeout(() => onComplete(results), 500)
  }

  function click(idx: number) {
    if (busy) return
    const card = cards[idx]
    if (matched.has(card.pid) || flipped.includes(idx)) return
    const next = [...flipped, idx]
    setFlipped(next)
    playFlip()
    if (next.length === 2) {
      setBusy(true)
      setMoves((m) => m + 1)
      const [a, b] = next.map((n) => cards[n])
      if (a.pid === b.pid && a.side !== b.side) {
        // 매치 — 콤보·점수 적립
        comboRef.current += 1
        const pts = computeScore({ basePoints: a.points, combo: comboRef.current })
        comboRef.current >= 2 ? playCombo(comboRef.current) : playPop()
        const m = new Set(matched).add(a.pid)
        fxKey.current += 1
        setFx({ key: fxKey.current, pts, tag: comboRef.current >= 2 ? `🔥 ${comboRef.current} 연속` : null })
        setCombo(comboRef.current)
        setScore((s) => s + pts)
        setTimeout(() => {
          setMatched(m)
          setFlipped([])
          setBusy(false)
          setFx(null)
          if (m.size === pairCount) finish(m, missed)
        }, 480)
      } else {
        // 실패 → 콤보 끊김, 관련 문제 missed 표시
        playWrong()
        comboRef.current = 0
        setCombo(0)
        setShake(true)
        setTimeout(() => setShake(false), 400)
        const ms = new Set(missed)
        ms.add(a.pid)
        ms.add(b.pid)
        setMissed(ms)
        setTimeout(() => {
          setFlipped([])
          setBusy(false)
        }, 820)
      }
    }
  }

  const comboTier = combo >= 6 ? 'tier3' : combo >= 4 ? 'tier2' : 'tier1'
  const mm = String(Math.floor(elapsed / 60)).padStart(1, '0')
  const ss = String(Math.floor(elapsed % 60)).padStart(2, '0')

  return (
    <GameFrame
      theme={theme}
      className={`memory-game ${shake ? 'shake' : ''}`}
      onExit={onExit}
      progress={`짝 ${matched.size} / ${pairCount}`}
      headerExtra={
        <>
          <span className="ox-score">💎 {score}</span>
          {combo >= 2 && <span className={`combo-chip ${comboTier}`}>🔥 {combo}</span>}
          <span className="mem-timer">⏱ {mm}:{ss}</span>
        </>
      }
    >
      {fx && (
        <div key={fx.key} className="fx-pop" aria-hidden>
          <span className="fx-pts">+{fx.pts}</span>
          {fx.tag && <span className="fx-tag">{fx.tag}</span>}
        </div>
      )}
      <p className="memory-hint">문제와 정답을 짝지어요 · 뒤집기 {moves}회</p>

      <div className="memory-arena">
        <div className="bt-stars" aria-hidden />
        <div className="memory-grid">
          {cards.map((c, idx) => {
            const isMatched = matched.has(c.pid)
            const isUp = flipped.includes(idx) || isMatched
            return (
              <button
                key={c.key}
                className={`mcard ${isUp ? 'up' : ''} ${isMatched ? 'matched' : ''} side-${c.side}`}
                onClick={() => click(idx)}
                disabled={isMatched}
              >
                <span className="mcard-inner">
                  <span className="mcard-face mcard-front">
                    <span className="mcard-emblem">?</span>
                  </span>
                  <span className="mcard-face mcard-back">
                    <span className="mcard-text">{c.text}</span>
                    {isMatched && <span className="mcard-spark" aria-hidden>✨</span>}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </GameFrame>
  )
}
