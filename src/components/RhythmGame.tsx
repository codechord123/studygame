import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Problem } from '../types/problem'
import { playCorrect, playWrong, playCombo, playPop, vibrate } from '../lib/juice'
import { computeScore } from '../game/gamification'
import { useRaf } from '../lib/useRaf'
import { GameFrame } from './GameFrame'
import { CountdownIntro } from './CountdownIntro'
import type { GameResult } from './SpeedOxGame'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

interface Tile {
  text: string
  correct: boolean
}
interface Row {
  problem: Problem
  tiles: Tile[]
  correctIdx: number
}

const LIVES = 4
const TRAVEL_BASE = 2200 // 타일이 선까지 내려오는 시간(ms)
const TRAVEL_MIN = 1350 // 콤보로 빨라지는 하한
const GAP = 340 // 판정 후 다음 줄까지 간격(ms)
const LINE_PCT = 78 // 판정선 위치(트랙 높이 %)

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildRows(problems: Problem[]): Row[] {
  const rows: Row[] = []
  for (const p of problems) {
    let tiles: Tile[] = []
    if (p.type === 'multiple_choice') {
      tiles = p.choices.map((c, idx) => ({ text: c, correct: idx === p.answer }))
    } else if (p.type === 'ox') {
      tiles = [
        { text: '⭕ 맞아요', correct: p.answer },
        { text: '❌ 아니에요', correct: !p.answer },
      ]
    } else {
      continue
    }
    tiles = shuffle(tiles)
    rows.push({ problem: p, tiles, correctIdx: tiles.findIndex((t) => t.correct) })
  }
  return rows
}

// 리듬 정답 두드리기 — 정답 타일이 판정선에 닿는 순간 그 칸을 탭.
// 타이밍(Perfect/Good) + 정답 둘 다 맞아야 점수. 오답 칸/놓침 = 생명 감소(찍기 방지).
export function RhythmGame({ problems, theme, onComplete, onExit }: Props) {
  const rows = useMemo(() => buildRows(problems), [problems])

  const [phase, setPhase] = useState<'go' | 'play'>('go')
  const [i, setI] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [combo, setCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [prog, setProg] = useState(0)
  const [fx, setFx] = useState<{ key: number; tag: string; good: boolean; pts?: number } | null>(null)
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)

  const iRef = useRef(0)
  const tRef = useRef(0)
  const resolvedRef = useRef(false)
  const livesRef = useRef(LIVES)
  const comboRef = useRef(0)
  const resultsRef = useRef<GameResult[]>([])
  const travelRef = useRef(TRAVEL_BASE)
  const fxKey = useRef(0)
  const finishedRef = useRef(false)

  const row = rows[i]

  function travelFor(): number {
    return Math.max(TRAVEL_MIN, TRAVEL_BASE - comboRef.current * 55)
  }

  function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete(resultsRef.current)
  }

  useRaf(phase === 'play' && !finishedRef.current, (dt) => {
    if (resolvedRef.current) return
    if (!rows[iRef.current]) {
      finish()
      return
    }
    tRef.current += dt * 1000
    const p = tRef.current / travelRef.current
    setProg(p)
    if (p > 1.3) resolveWrong('놓침!')
  })

  function showFx(tag: string, good: boolean, pts?: number) {
    fxKey.current += 1
    setFx({ key: fxKey.current, tag, good, pts })
  }
  function flashNow(kind: 'good' | 'bad') {
    setFlash(kind)
    window.setTimeout(() => setFlash(null), 260)
  }
  function pushResult(correct: boolean) {
    const r = rows[iRef.current]
    if (r) resultsRef.current = [...resultsRef.current, { id: r.problem.id, correct }]
  }

  function next() {
    if (livesRef.current <= 0 || iRef.current + 1 >= rows.length) {
      finish()
      return
    }
    iRef.current += 1
    setI(iRef.current)
    tRef.current = 0
    travelRef.current = travelFor()
    resolvedRef.current = false
    setProg(0)
    playPop() // 다음 줄 비트
  }

  function resolveHit(ratio: number, tag: string) {
    resolvedRef.current = true
    comboRef.current += 1
    setCombo(comboRef.current)
    const pts = computeScore({
      basePoints: rows[iRef.current].problem.points,
      combo: comboRef.current,
      timeLeftRatio: ratio,
    })
    setScore((s) => s + pts)
    comboRef.current >= 2 ? playCombo(comboRef.current) : playCorrect()
    vibrate(20)
    flashNow('good')
    showFx(tag, true, pts)
    pushResult(true)
    window.setTimeout(next, GAP)
  }

  function resolveWrong(tag: string) {
    if (resolvedRef.current) return
    resolvedRef.current = true
    comboRef.current = 0
    setCombo(0)
    livesRef.current -= 1
    setLives(livesRef.current)
    playWrong()
    vibrate([40, 30, 40])
    flashNow('bad')
    showFx(tag, false)
    pushResult(false)
    window.setTimeout(next, GAP)
  }

  function tapCol(idx: number) {
    if (resolvedRef.current || phase !== 'play') return
    const r = rows[iRef.current]
    if (!r) return
    const p = tRef.current / travelRef.current
    if (idx === r.correctIdx) {
      if (p < 0.5) {
        showFx('너무 일러요', false) // 너무 이른 탭은 무효(찍기 방지·페널티 없음)
        return
      }
      const d = Math.abs(p - 1)
      if (d <= 0.1) resolveHit(1, 'PERFECT!')
      else if (d <= 0.25) resolveHit(0.6, 'GOOD!')
      else resolveHit(0.3, 'OK')
    } else {
      resolveWrong('땡!')
    }
  }

  const tileTop = Math.min(prog, 1.36) * LINE_PCT

  return (
    <GameFrame
      theme={theme}
      className={`rhythm-game ${flash ? 'rflash-' + flash : ''}`}
      onExit={onExit}
      progress={`${Math.min(i + 1, rows.length)} / ${rows.length}`}
      combo={combo}
      lives={lives}
      headerExtra={<span className="ox-score">🎵 {score}</span>}
    >
      {phase === 'go' && (
        <CountdownIntro
          onDone={() => {
            travelRef.current = travelFor()
            setPhase('play')
          }}
          go="START!"
        />
      )}

      <p className="rhythm-q">{row?.problem.prompt}</p>

      <div className="rhythm-track">
        <div className="bt-stars" aria-hidden />
        <div className="rhythm-line" style={{ top: `${LINE_PCT}%` }} aria-hidden>
          <span className="rhythm-line-pulse" />
        </div>
        {fx && (
          <div key={fx.key} className={`rhythm-fx ${fx.good ? 'good' : 'bad'}`} aria-hidden>
            <span className="rhythm-fx-tag">{fx.tag}</span>
            {fx.pts != null && <span className="rhythm-fx-pts">+{fx.pts}</span>}
          </div>
        )}
        <div
          className="rhythm-cols"
          style={{ '--cols': String(row?.tiles.length ?? 1) } as CSSProperties}
        >
          {row?.tiles.map((t, idx) => {
            const state = !resolvedRef.current ? '' : t.correct ? 'hit' : 'dim'
            return (
              <button key={`${i}-${idx}`} className="rcol" onClick={() => tapCol(idx)}>
                <span className={`rtile ${state}`} style={{ top: `${tileTop}%` }}>
                  {t.text}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="rhythm-hint">정답 타일이 ━선━ 에 닿는 순간 그 칸을 탭! · 막 찍으면 생명이 줄어요 💔</p>
    </GameFrame>
  )
}
