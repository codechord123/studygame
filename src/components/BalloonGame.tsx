import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'

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
  const [results, setResults] = useState<GameResult[]>([])
  const [flash, setFlash] = useState<null | { correct: boolean; answer: string }>(null)

  const balloonsRef = useRef<Balloon[]>([])
  const resultsRef = useRef<GameResult[]>([])
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
      y: 108 + lane * 26 + Math.random() * 14, // 아래에서 시차를 두고 떠오름
      speed: 9 + Math.random() * 4,
      hue: Math.floor(Math.random() * 360),
    }))
    balloonsRef.current = next
    setBalloons(next)
    setFlash(null)
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
          // 천장 위로 사라지면 아래에서 다시 떠오름
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
    setResults(next)
    setFlash({ correct, answer: problem.choices[problem.answer] })
    window.setTimeout(() => {
      if (qi + 1 >= mcs.length) onComplete(next)
      else {
        setFlash(null)
        setQi(qi + 1)
      }
    }, 950)
  }

  function pop(b: Balloon) {
    if (lockRef.current) return
    resolve(b.correct)
  }

  if (!problem) return null
  const score = results.filter((r) => r.correct).length

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
        <span className="ox-score">⭐ {score}</span>
        <span className={`timer ${time <= 4 ? 'danger' : ''}`}>⏱ {time}s</span>
      </div>

      <p className="rain-question">{problem.prompt}</p>
      <p className="rain-hint">정답이 든 풍선을 펑! 터뜨려요 🎈</p>

      <div className="balloon-field">
        {balloons.map((b) => (
          <button
            key={b.choiceIdx}
            className={`balloon ${flash ? (b.correct ? 'reveal-ok' : 'reveal-no') : ''}`}
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
          <div className="feedback-head">{flash.correct ? '정답! 🎉' : `아쉬워요 — 정답: ${flash.answer}`}</div>
          {problem.explanation && <div className="explain">📘 {problem.explanation}</div>}
        </div>
      )}
    </div>
  )
}
