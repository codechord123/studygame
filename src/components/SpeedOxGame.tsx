import { useEffect, useMemo, useState } from 'react'
import type { Problem } from '../types/problem'
import { correctAnswerText } from '../lib/grading'
import { playCorrect, playWrong } from '../lib/sfx'
import { GameFrame } from './GameFrame'

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

const PER_SEC = 7

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

// 보여준 답이 맞는지 O/X 로 빠르게 판단하는 미니게임.
export function SpeedOxGame({ problems, theme, onComplete, onExit }: Props) {
  const items = useMemo(() => buildItems(problems), [problems])
  const [i, setI] = useState(0)
  const [results, setResults] = useState<GameResult[]>([])
  const [picked, setPicked] = useState<null | { o: boolean; correct: boolean }>(null)
  const [time, setTime] = useState(PER_SEC)

  const item = items[i]

  // 타이머
  useEffect(() => {
    if (picked) return
    if (time <= 0) {
      answer(null)
      return
    }
    const t = setTimeout(() => setTime((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, picked])

  function answer(o: boolean | null) {
    if (picked) return
    const correct = o !== null && o === item.expectO
    if (correct) playCorrect()
    else playWrong()
    setPicked({ o: o ?? false, correct })
    const next = [...results, { id: item.problem.id, correct }]
    setResults(next)
    window.setTimeout(() => {
      if (i + 1 >= items.length) onComplete(next)
      else {
        setI(i + 1)
        setPicked(null)
        setTime(PER_SEC)
      }
    }, 800)
  }

  const score = results.filter((r) => r.correct).length

  return (
    <GameFrame
      theme={theme}
      className="ox-game"
      onExit={onExit}
      progress={`${i + 1} / ${items.length}`}
      time={time}
      timeDanger={time <= 3}
      headerExtra={<span className="ox-score">⭐ {score}</span>}
    >
      <div className="timer-bar">
        <div className="timer-bar-fill" style={{ width: `${(time / PER_SEC) * 100}%` }} />
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
