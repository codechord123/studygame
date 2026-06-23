import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'
import { computeScore } from '../game/gamification'
import { playCorrect, playWrong, playCombo, playPop } from '../lib/sfx'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

interface Balloon {
  choiceIdx: number
  correct: boolean
  x: number // 0~100 (%)
  y: number // 0~100 (%) — 100 바닥, 0 천장
  speed: number // %/초 (위로)
  hue: number
}

const PER_SEC = 16 // 문제당 제한 시간(넉넉)

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 보기를 단 풍선이 위로 둥실 떠오른다. 정답이 든 풍선을 펑! 터뜨린다.
export function BalloonGame({ problems, theme, onComplete, onExit }: Props) {
  const mcs = useMemo(
    () => problems.filter((p): p is MultipleChoiceProblem => p.type === 'multiple_choice'),
    [problems],
  )
  const [qi, setQi] = useState(0)
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [time, setTime] = useState(PER_SEC)
  const [combo, setCombo] = useState(0)
  const [gained, setGained] = useState(0)
  const [popped, setPopped] = useState<number | null>(null)
  const [flash, setFlash] = useState<null | { correct: boolean; answer: string; pts: number; combo: number }>(null)

  const balloonsRef = useRef<Balloon[]>([])
  const resultsRef = useRef<GameResult[]>([])
  const comboRef = useRef(0)
  const gainedRef = useRef(0)
  const lockRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const problem = mcs[qi]

  useEffect(() => {
    if (mcs.length === 0) onComplete([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 문제마다 풍선 생성
  useEffect(() => {
    if (!problem) return
    lockRef.current = false
    const lanes = shuffle(problem.choices.map((_, i) => i))
    const n = problem.choices.length
    const next: Balloon[] = lanes.map((choiceIdx, lane) => ({
      choiceIdx,
      correct: choiceIdx === problem.answer,
      x: 10 + (lane + 0.5) * (80 / n) + (Math.random() * 6 - 3),
      y: 108 + lane * 26 + Math.random() * 14,
      speed: 9 + Math.random() * 4,
      hue: Math.floor(Math.random() * 360),
    }))
    balloonsRef.current = next
    setBalloons(next)
    setFlash(null)
    setPopped(null)
    setTime(PER_SEC)
    lastRef.current = 0
  }, [qi, problem])

  // 떠오르는 애니메이션
  useEffect(() => {
    if (!problem || flash) return
    function tick(ts: number) {
      if (!lastRef.current) lastRef.current = ts
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000)
      lastRef.current = ts
      const moved = balloonsRef.current.map((b) => {
        let y = b.y - b.speed * dt
        let x = b.x
        let speed = b.speed
        if (y < -14) {
          y = 108 + Math.random() * 20
          x = 10 + Math.random() * 80
          speed = 9 + Math.random() * 4
        }
        return { ...b, x, y, speed }
      })
      balloonsRef.current = moved
      setBalloons(moved)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastRef.current = 0
    }
  }, [qi, problem, flash])

  // 제한 시간
  useEffect(() => {
    if (!problem || flash) return
    if (time <= 0) {
      resolve(false)
      return
    }
    const t = window.setTimeout(() => setTime((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, problem, flash])

  function resolve(correct: boolean) {
    if (lockRef.current || !problem) return
    lockRef.current = true
    const next = [...resultsRef.current, { id: problem.id, correct }]
    resultsRef.current = next
    let pts = 0
    if (correct) {
      comboRef.current += 1
      pts = computeScore({ basePoints: problem.points, combo: comboRef.current })
      gainedRef.current += pts
      if (comboRef.current >= 2) playCombo(comboRef.current)
      else playCorrect()
    } else {
      comboRef.current = 0
      playWrong()
    }
    setCombo(comboRef.current)
    setGained(gainedRef.current)
    setFlash({ correct, answer: problem.choices[problem.answer], pts, combo: comboRef.current })
    window.setTimeout(() => {
      if (qi + 1 >= mcs.length) onComplete(next)
      else {
        setFlash(null)
        setQi(qi + 1)
      }
    }, 1000)
  }

  function pop(b: Balloon) {
    if (lockRef.current) return
    playPop()
    setPopped(b.choiceIdx)
    resolve(b.correct)
  }

  if (!problem) return null

  return (
    <div className={`card balloon-game ${theme ?? ''}`}>
      <div className="q-meta">
        {onExit && (
          <button className="q-exit" onClick={onExit}>
            ← 나가기
          </button>
        )}
        <span className="q-progress">
          {qi + 1} / {mcs.length}
        </span>
        {combo >= 2 && <span className="combo-chip">🔥 {combo} COMBO</span>}
        <span className="ox-score">💎 {gained}</span>
        <span className={`timer ${time <= 4 ? 'danger' : ''}`}>⏱ {time}s</span>
      </div>

      <p className="rain-question">{problem.prompt}</p>
      <p className="rain-hint">정답이 든 풍선을 펑! 터뜨려요 🎈</p>

      <div className="balloon-field">
        {balloons.map((b) => (
          <button
            key={b.choiceIdx}
            className={`balloon ${popped === b.choiceIdx ? 'pop-anim' : ''} ${
              flash ? (b.correct ? 'reveal-ok' : 'reveal-no') : ''
            }`}
            style={{ left: `${b.x}%`, top: `${b.y}%`, ['--hue' as string]: b.hue }}
            onClick={() => pop(b)}
            disabled={!!flash}
          >
            <span className="balloon-label">{b.choiceIdx + 1}. {problem.choices[b.choiceIdx]}</span>
            <span className="balloon-string" />
          </button>
        ))}
      </div>

      {flash && (
        <div className={`feedback ${flash.correct ? 'good' : 'bad'}`}>
          <div className="feedback-head">
            {flash.correct
              ? `정답! 🎉 +${flash.pts}${flash.combo >= 2 ? `  🔥${flash.combo} 콤보` : ''}`
              : `아쉬워요 — 정답: ${flash.answer}`}
          </div>
          {problem.explanation && <div className="explain">📘 {problem.explanation}</div>}
        </div>
      )}
    </div>
  )
}
