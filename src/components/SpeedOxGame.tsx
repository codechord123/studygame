import { useMemo, useRef, useState } from 'react'
import type { Problem } from '../types/problem'
import { correctAnswerText } from '../lib/grading'
import { playCorrect, playWrong, playCombo, playBomb } from '../lib/sfx'
import { computeScore } from '../game/gamification'
import { useRaf } from '../lib/useRaf'
import { GameFrame } from './GameFrame'
import { TimerRing } from './TimerRing'

export interface GameResult {
  id: string
  correct: boolean
}

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

interface OxItem {
  problem: Problem
  statement: string
  candidate?: string
  expectO: boolean // O가 정답인가
}

const TOTAL = 6 // 문항당 제한 시간(초)
const START_LIVES = 3

function buildItems(problems: Problem[]): OxItem[] {
  const pool = problems.map((p) => correctAnswerText(p))
  return problems.map((p, i) => {
    if (p.type === 'ox') {
      return { problem: p, statement: p.prompt, expectO: p.answer }
    }
    const showCorrect = Math.random() < 0.5
    let candidate = correctAnswerText(p)
    if (!showCorrect) {
      if (p.type === 'multiple_choice') {
        const wrong = p.choices.map((_, idx) => idx).filter((idx) => idx !== p.answer)
        const pick = wrong[Math.floor(Math.random() * wrong.length)]
        candidate = `${pick + 1}번. ${p.choices[pick]}`
      } else {
        const others = pool.filter((x, idx) => idx !== i && x !== candidate)
        candidate = others.length
          ? others[Math.floor(Math.random() * others.length)]
          : candidate + ' (?)'
      }
    }
    return { problem: p, statement: p.prompt, candidate, expectO: showCorrect }
  })
}

interface Fx {
  key: number
  pts: number
  tag: string | null
}

// 보여준 답이 맞는지 O/X 로 빠르게 판단하는 반사신경 미니게임.
// 생명 3개 · 빠를수록 고득점 · 연속 정답 콤보.
export function SpeedOxGame({ problems, theme, onComplete, onExit }: Props) {
  const items = useMemo(() => buildItems(problems), [problems])
  const [i, setI] = useState(0)
  const [results, setResults] = useState<GameResult[]>([])
  const [picked, setPicked] = useState<null | { o: boolean; correct: boolean }>(null)
  const [t, setT] = useState(TOTAL)
  const [lives, setLives] = useState(START_LIVES)
  const [lifeLost, setLifeLost] = useState(false)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [fx, setFx] = useState<Fx | null>(null)
  const [flash, setFlash] = useState<null | 'good' | 'bad'>(null)

  const tRef = useRef(TOTAL)
  const livesRef = useRef(START_LIVES)
  const streakRef = useRef(0)
  const fxKey = useRef(0)

  const item = items[i]
  const active = !picked && !!item && livesRef.current > 0

  // 부드러운 카운트다운
  useRaf(active, (dt) => {
    tRef.current -= dt
    if (tRef.current <= 0) {
      tRef.current = 0
      setT(0)
      answer(null)
      return
    }
    setT(tRef.current)
  })

  function answer(o: boolean | null) {
    if (picked || !item) return
    const ratio = Math.max(0, tRef.current) / TOTAL
    const correct = o !== null && o === item.expectO
    setPicked({ o: o ?? false, correct })

    if (correct) {
      streakRef.current += 1
      const pts = computeScore({ basePoints: item.problem.points, combo: streakRef.current, timeLeftRatio: ratio })
      setScore((s) => s + pts)
      const fast = ratio > 0.66
      const tag = streakRef.current >= 2 ? `🔥 ${streakRef.current} 연속` : fast ? '⚡ 번개!' : null
      fxKey.current += 1
      setFx({ key: fxKey.current, pts, tag })
      setFlash('good')
      streakRef.current >= 2 ? playCombo(streakRef.current) : playCorrect()
    } else {
      streakRef.current = 0
      livesRef.current -= 1
      setLifeLost(true)
      window.setTimeout(() => setLifeLost(false), 500)
      setFlash('bad')
      o === null ? playBomb() : playWrong()
    }
    setStreak(streakRef.current)
    setLives(livesRef.current)
    window.setTimeout(() => setFlash(null), 500)

    const next = [...results, { id: item.problem.id, correct }]
    setResults(next)

    window.setTimeout(() => {
      if (livesRef.current <= 0 || i + 1 >= items.length) {
        onComplete(next)
      } else {
        setI(i + 1)
        setPicked(null)
        setFx(null)
        tRef.current = TOTAL
        setT(TOTAL)
      }
    }, 850)
  }

  const comboTier = streak >= 6 ? 'tier3' : streak >= 4 ? 'tier2' : 'tier1'

  return (
    <GameFrame
      theme={theme}
      className="ox-game"
      onExit={onExit}
      progress={`${i + 1} / ${items.length}`}
      headerExtra={
        <>
          <span className="ox-score">💎 {score}</span>
          {streak >= 2 && <span className={`combo-chip ${comboTier}`}>🔥 {streak} COMBO</span>}
          <span className={`gf-lives ${lifeLost ? 'lost' : ''}`}>{'❤️'.repeat(Math.max(0, lives))}</span>
        </>
      }
    >
      {flash && <div className={`hit-flash ${flash}`} aria-hidden />}
      {fx && (
        <div key={fx.key} className="fx-pop" aria-hidden>
          <span className="fx-pts">+{fx.pts}</span>
          {fx.tag && <span className="fx-tag">{fx.tag}</span>}
        </div>
      )}

      <div className="ox-top">
        <TimerRing ratio={t / TOTAL} label={Math.ceil(t)} danger={t <= 2.2} />
      </div>

      <p className="ox-question">{item.statement}</p>
      {item.candidate && (
        <div className="ox-candidate">
          정답: <b>{item.candidate}</b> <span className="ox-ask">— 맞을까요?</span>
        </div>
      )}
      {item.problem.type === 'ox' && <div className="ox-candidate ox-ask">맞으면 O, 틀리면 X</div>}

      <div className="ox-buttons">
        <button
          className={`ox-big o ${picked && picked.o ? (picked.correct ? 'ok' : 'no') : ''}`}
          disabled={!!picked}
          onClick={() => answer(true)}
        >
          ⭕
        </button>
        <button
          className={`ox-big x ${picked && !picked.o ? (picked.correct ? 'ok' : 'no') : ''}`}
          disabled={!!picked}
          onClick={() => answer(false)}
        >
          ❌
        </button>
      </div>

      {picked && (
        <div className={`feedback ${picked.correct ? 'good' : 'bad'}`}>
          <div className="feedback-head">{picked.correct ? '정답! 🎉' : '땡! 😢'}</div>
          {item.problem.explanation && <div className="explain">📘 {item.problem.explanation}</div>}
        </div>
      )}
    </GameFrame>
  )
}
