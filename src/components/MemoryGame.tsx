import { useMemo, useState } from 'react'
import type { Problem } from '../types/problem'
import { correctAnswerText } from '../lib/grading'
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
}

function shortPrompt(p: Problem): string {
  const t = p.prompt.replace(/\{\{\d+\}\}/g, '___').replace(/\s+/g, ' ').trim()
  return t.length > 36 ? t.slice(0, 35) + '…' : t
}

function buildCards(problems: Problem[]): Card[] {
  const picked = problems.slice(0, 6) // 최대 6쌍(12장)
  const cards: Card[] = []
  picked.forEach((p) => {
    cards.push({ key: p.id + '-q', pid: p.id, side: 'q', text: shortPrompt(p) })
    cards.push({ key: p.id + '-a', pid: p.id, side: 'a', text: correctAnswerText(p) })
  })
  // 셔플
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

// 문제 카드와 답 카드를 짝지어 뒤집는 메모리 게임.
export function MemoryGame({ problems, theme, onComplete, onExit }: Props) {
  const cards = useMemo(() => buildCards(problems), [problems])
  const pairCount = cards.length / 2
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [missed, setMissed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  function finish(matchedSet: Set<string>, missedSet: Set<string>) {
    const ids = new Set(cards.map((c) => c.pid))
    const results: GameResult[] = [...ids].map((id) => ({ id, correct: !missedSet.has(id) }))
    void matchedSet
    onComplete(results)
  }

  function click(idx: number) {
    if (busy) return
    const card = cards[idx]
    if (matched.has(card.pid) || flipped.includes(idx)) return
    const next = [...flipped, idx]
    setFlipped(next)
    if (next.length === 2) {
      setBusy(true)
      const [a, b] = next.map((n) => cards[n])
      if (a.pid === b.pid && a.side !== b.side) {
        // 매치
        const m = new Set(matched).add(a.pid)
        setTimeout(() => {
          setMatched(m)
          setFlipped([])
          setBusy(false)
          if (m.size === pairCount) finish(m, missed)
        }, 450)
      } else {
        // 실패 → 관련 문제에 missed 표시
        const ms = new Set(missed)
        ms.add(a.pid)
        ms.add(b.pid)
        setMissed(ms)
        setTimeout(() => {
          setFlipped([])
          setBusy(false)
        }, 850)
      }
    }
  }

  return (
    <div className={`card memory-game ${theme ?? ''}`}>
      <div className="q-meta">
        {onExit && (
          <button className="q-exit" onClick={onExit}>
            ← 나가기
          </button>
        )}
        <span className="q-progress">짝 {matched.size} / {pairCount}</span>
      </div>
      <p className="memory-hint">문제와 정답을 짝지어 뒤집어요!</p>

      <div className="memory-grid">
        {cards.map((c, idx) => {
          const isUp = flipped.includes(idx) || matched.has(c.pid)
          return (
            <button
              key={c.key}
              className={`mcard ${isUp ? 'up' : ''} ${matched.has(c.pid) ? 'matched' : ''} side-${c.side}`}
              onClick={() => click(idx)}
              disabled={matched.has(c.pid)}
            >
              {isUp ? <span className="mcard-text">{c.text}</span> : <span className="mcard-back">?</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
