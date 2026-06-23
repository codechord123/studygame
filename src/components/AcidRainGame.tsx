import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'
import { QuestionCard } from './QuestionCard'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

interface Drop {
  pid: string
  x: number // 0~100 (%)
  y: number // 0~100 (%)
  speed: number // %/초
}

// 빗방울이 떨어진다. 빗방울을 클릭하면 그 안에 든 문제가 나오고, 풀면 빗방울이 사라진다.
export function AcidRainGame({ problems, theme, onComplete, onExit }: Props) {
  const all = useMemo(() => problems, [problems])
  const [drops, setDrops] = useState<Drop[]>(() =>
    all.map((p, i) => ({
      pid: p.id,
      x: 8 + (i % 5) * 19 + (Math.random() * 8 - 4),
      y: -10 - (i % 5) * 18 - Math.random() * 30,
      speed: 11 + Math.random() * 6,
    })),
  )
  const [activePid, setActivePid] = useState<string | null>(null)
  const [results, setResults] = useState<GameResult[]>([])
  const [splash, setSplash] = useState<null | { correct: boolean }>(null)

  const dropsRef = useRef<Drop[]>(drops)
  const resultsRef = useRef<GameResult[]>([])
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)

  useEffect(() => {
    if (all.length === 0) onComplete([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 낙하 애니메이션 (문제 풀이 중에는 멈춤)
  useEffect(() => {
    if (activePid) return
    lastRef.current = 0
    function tick(ts: number) {
      if (!lastRef.current) lastRef.current = ts
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000)
      lastRef.current = ts
      const moved = dropsRef.current.map((d) => {
        let y = d.y + d.speed * dt
        let x = d.x
        let speed = d.speed
        // 바닥에 닿으면 위로 재활용(문제는 사라지지 않음)
        if (y > 108) {
          y = -8 - Math.random() * 14
          x = 8 + Math.random() * 84
          speed = 11 + Math.random() * 6
        }
        return { ...d, x, y, speed }
      })
      dropsRef.current = moved
      setDrops(moved)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [activePid])

  function open(pid: string) {
    if (activePid) return
    setActivePid(pid)
  }

  function answer(correct: boolean) {
    const pid = activePid!
    const next = [...resultsRef.current, { id: pid, correct }]
    resultsRef.current = next
    setResults(next)
    // 푼 빗방울 제거
    dropsRef.current = dropsRef.current.filter((d) => d.pid !== pid)
    setDrops(dropsRef.current)
    setActivePid(null)
    setSplash({ correct })
    window.setTimeout(() => setSplash(null), 700)
    if (dropsRef.current.length === 0) {
      window.setTimeout(() => onComplete(next), 300)
    }
  }

  const activeProblem = activePid ? all.find((p) => p.id === activePid) ?? null : null
  const solved = results.length
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
          {solved} / {all.length}
        </span>
        <span className="ox-score">⭐ {score}</span>
      </div>

      <p className="rain-hint">떨어지는 빗방울을 콕! 누르면 문제가 나와요 💧</p>

      <div className="rain-field">
        {drops.map((d) => (
          <button
            key={d.pid}
            className="raindrop drop-icon"
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
            onClick={() => open(d.pid)}
          >
            💧
          </button>
        ))}
        <div className="rain-ground" />
        {splash && (
          <div className={`rain-flash ${splash.correct ? 'good' : 'bad'}`}>
            {splash.correct ? '정답! 🎉' : '아쉬워요 😢'}
          </div>
        )}
        {drops.length === 0 && !activeProblem && <div className="rain-clear">모든 빗방울을 풀었어요! 🌈</div>}
      </div>

      {activeProblem && (
        <div className="rain-overlay">
          <QuestionCard
            key={activeProblem.id}
            problem={activeProblem}
            index={solved}
            total={all.length}
            combo={0}
            mode="study"
            theme={theme}
            onSubmit={(r) => answer(r.correct)}
          />
        </div>
      )}
    </div>
  )
}
