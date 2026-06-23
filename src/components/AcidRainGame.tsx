import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

interface Drop {
  id: number
  label: string
  choiceIdx: number
  correct: boolean
  x: number // 0~100 (%)
  y: number // 0~100 (%) — 100 이면 바닥
  speed: number // %/초
}

const START_LIVES = 3

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 빗방울을 만들어 화면에 떨어뜨린다. 정답 빗방울을 받고, 오답(산성비)은 피한다.
export function AcidRainGame({ problems, theme, onComplete, onExit }: Props) {
  const mcs = useMemo(
    () => problems.filter((p): p is MultipleChoiceProblem => p.type === 'multiple_choice'),
    [problems],
  )
  const [qi, setQi] = useState(0)
  const [drops, setDrops] = useState<Drop[]>([])
  const [lives, setLives] = useState(START_LIVES)
  const [results, setResults] = useState<GameResult[]>([])
  const [flash, setFlash] = useState<null | { correct: boolean; answer: string }>(null)

  const resultsRef = useRef<GameResult[]>([])
  const livesRef = useRef(START_LIVES)
  const lockRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(0)
  const dropsRef = useRef<Drop[]>([])

  const problem = mcs[qi]

  // 문제가 없으면 즉시 종료
  useEffect(() => {
    if (mcs.length === 0) onComplete([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 문제마다 빗방울 생성
  useEffect(() => {
    if (!problem) return
    lockRef.current = false
    const lanes = shuffle(problem.choices.map((_, i) => i))
    const n = problem.choices.length
    const next: Drop[] = lanes.map((choiceIdx, lane) => ({
      id: qi * 100 + choiceIdx,
      label: problem.choices[choiceIdx],
      choiceIdx,
      correct: choiceIdx === problem.answer,
      x: 8 + (lane + 0.5) * (84 / n) + (Math.random() * 8 - 4),
      y: -10 - lane * 22 - Math.random() * 10, // 위에서 시차를 두고 등장
      speed: 13 + Math.random() * 5, // %/초 (≈ 7~9초 낙하)
    }))
    dropsRef.current = next
    setDrops(next)
    setFlash(null)
    lastRef.current = 0
  }, [qi, problem])

  // 애니메이션 루프
  useEffect(() => {
    if (!problem || flash) return
    function tick(ts: number) {
      if (!lastRef.current) lastRef.current = ts
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000)
      lastRef.current = ts
      let correctPassed = false
      const moved = dropsRef.current.map((d) => {
        const y = d.y + d.speed * dt
        if (y >= 100 && d.correct) correctPassed = true
        return { ...d, y }
      })
      // 화면 밖으로 나간 오답 방울은 제거(잘 피함)
      dropsRef.current = moved.filter((d) => d.y < 112)
      setDrops(dropsRef.current)
      // 정답 빗방울이 바닥에 닿으면 놓침 → 오답 처리
      if (correctPassed && !lockRef.current) {
        resolve(false, '놓쳤어요')
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastRef.current = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, problem, flash])

  function resolve(correct: boolean, _why?: string) {
    if (lockRef.current || !problem) return
    lockRef.current = true
    const nextResults = [...resultsRef.current, { id: problem.id, correct }]
    resultsRef.current = nextResults
    setResults(nextResults)
    if (!correct) {
      const nl = livesRef.current - 1
      livesRef.current = nl
      setLives(nl)
    }
    setFlash({ correct, answer: problem.choices[problem.answer] })
    window.setTimeout(() => {
      if (livesRef.current <= 0) {
        // 생명 소진 → 남은 문제는 오답으로 채우고 종료
        const filled = [...nextResults]
        for (let k = qi + 1; k < mcs.length; k++) filled.push({ id: mcs[k].id, correct: false })
        onComplete(filled)
        return
      }
      if (qi + 1 >= mcs.length) onComplete(nextResults)
      else setQi(qi + 1)
    }, 950)
  }

  function tap(d: Drop) {
    if (lockRef.current) return
    resolve(d.correct)
  }

  if (!problem) return null
  const score = results.filter((r) => r.correct).length

  return (
    <div className={`card rain-game ${theme ?? ''}`}>
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
        <span className="rain-lives">{'❤️'.repeat(Math.max(0, lives))}</span>
      </div>

      <p className="rain-question">{problem.prompt}</p>
      <p className="rain-hint">정답 빗방울을 콕! 눌러 받아요 💧</p>

      <div className="rain-field">
        {drops.map((d) => (
          <button
            key={d.id}
            className={`raindrop ${flash ? (d.correct ? 'reveal-ok' : 'reveal-no') : ''}`}
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
            onClick={() => tap(d)}
            disabled={!!flash}
          >
            {d.label}
          </button>
        ))}
        <div className="rain-ground" />
        {flash && (
          <div className={`rain-flash ${flash.correct ? 'good' : 'bad'}`}>
            {flash.correct ? '정답! 🎉' : `아쉬워요 — 정답: ${flash.answer}`}
          </div>
        )}
      </div>
    </div>
  )
}
