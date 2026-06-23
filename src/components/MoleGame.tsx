import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

const HOLES = 9 // 3×3
const PER_SEC = 20 // 문제당 제한 시간(넉넉하게)
const ROLL_MS = 2400 // 두더지가 다시 솟는 주기(천천히 — 읽고 칠 시간)

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Mole {
  hole: number
  choiceIdx: number
  correct: boolean
}

// 두더지가 보기를 들고 솟아오른다. 정답을 든 두더지를 빠르게 친다.
export function MoleGame({ problems, theme, onComplete, onExit }: Props) {
  const mcs = useMemo(
    () => problems.filter((p): p is MultipleChoiceProblem => p.type === 'multiple_choice'),
    [problems],
  )
  const [qi, setQi] = useState(0)
  const [moles, setMoles] = useState<Mole[]>([])
  const [time, setTime] = useState(PER_SEC)
  const [results, setResults] = useState<GameResult[]>([])
  const [flash, setFlash] = useState<null | { correct: boolean; answer: string }>(null)

  const resultsRef = useRef<GameResult[]>([])
  const lockRef = useRef(false)
  const correctHoleRef = useRef(0)
  const problem = mcs[qi]

  useEffect(() => {
    if (mcs.length === 0) onComplete([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 두더지 솟기 — 정답 두더지는 한 구멍에 고정(노리는 사이 사라지지 않게),
  // 오답 두더지만 주변 구멍을 돌아다닌다.
  useEffect(() => {
    if (!problem || flash) return
    lockRef.current = false
    const correctHole = Math.floor(Math.random() * HOLES)
    correctHoleRef.current = correctHole

    function roll() {
      const others = shuffle(problem.choices.map((_, i) => i).filter((i) => i !== problem.answer))
      const showCount = Math.min(others.length, 1 + Math.floor(Math.random() * 2))
      const freeHoles = shuffle(
        Array.from({ length: HOLES }, (_, i) => i).filter((h) => h !== correctHole),
      )
      const next: Mole[] = [
        { hole: correctHole, choiceIdx: problem.answer, correct: true },
        ...others.slice(0, showCount).map((choiceIdx, k) => ({
          hole: freeHoles[k],
          choiceIdx,
          correct: false,
        })),
      ]
      setMoles(next)
    }

    roll()
    setTime(PER_SEC)
    const rollT = window.setInterval(roll, ROLL_MS)
    return () => window.clearInterval(rollT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function whack(m: Mole) {
    if (lockRef.current) return
    resolve(m.correct)
  }

  if (!problem) return null
  const score = results.filter((r) => r.correct).length
  const moleAt = (hole: number) => moles.find((m) => m.hole === hole)

  return (
    <div className={`card mole-game ${theme ?? ''}`}>
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
      <p className="rain-hint">정답을 든 두더지를 콩! 쳐요 🔨</p>

      <div className="mole-grid">
        {Array.from({ length: HOLES }, (_, h) => {
          const m = moleAt(h)
          return (
            <div key={h} className="mole-hole">
              {m && (
                <button
                  className={`mole ${flash ? (m.correct ? 'reveal-ok' : 'reveal-no') : ''}`}
                  onClick={() => whack(m)}
                  disabled={!!flash}
                >
                  <span className="mole-face">🦔</span>
                  <span className="mole-label">{m.choiceIdx + 1}. {problem.choices[m.choiceIdx]}</span>
                </button>
              )}
            </div>
          )
        })}
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
