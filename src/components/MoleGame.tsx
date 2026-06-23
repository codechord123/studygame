import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'
import { computeScore } from '../game/gamification'
import { playCorrect, playWrong, playCombo, playBomb } from '../lib/sfx'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

const HOLES = 9 // 3×3
const PER_SEC = 20 // 문제당 제한 시간(넉넉하게)
const ROLL_MS = 2400 // 오답·폭탄이 자리를 바꾸는 주기
const BOMB_CHANCE = 0.55

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
  bomb?: boolean
}

// 두더지가 보기를 들고 솟는다. 정답 두더지를 콩! 친다. 💣 폭탄은 피해야 한다.
export function MoleGame({ problems, theme, onComplete, onExit }: Props) {
  const mcs = useMemo(
    () => problems.filter((p): p is MultipleChoiceProblem => p.type === 'multiple_choice'),
    [problems],
  )
  const [qi, setQi] = useState(0)
  const [moles, setMoles] = useState<Mole[]>([])
  const [time, setTime] = useState(PER_SEC)
  const [combo, setCombo] = useState(0)
  const [gained, setGained] = useState(0)
  const [flash, setFlash] = useState<null | { kind: 'good' | 'bad' | 'bomb'; answer: string; pts: number; combo: number }>(null)

  const resultsRef = useRef<GameResult[]>([])
  const comboRef = useRef(0)
  const gainedRef = useRef(0)
  const lockRef = useRef(false)
  const correctHoleRef = useRef(0)
  const problem = mcs[qi]

  useEffect(() => {
    if (mcs.length === 0) onComplete([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 정답 두더지는 한 구멍에 고정(노리는 사이 사라지지 않게), 오답·폭탄만 돌아다닌다.
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
      // 가끔 폭탄을 남은 구멍에 — 누르면 실패!
      if (Math.random() < BOMB_CHANCE && freeHoles.length > showCount) {
        next.push({ hole: freeHoles[showCount], choiceIdx: -1, correct: false, bomb: true })
      }
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

  function resolve(correct: boolean, bomb = false) {
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
      if (bomb) playBomb()
      playWrong()
    }
    setCombo(comboRef.current)
    setGained(gainedRef.current)
    setFlash({
      kind: bomb ? 'bomb' : correct ? 'good' : 'bad',
      answer: problem.choices[problem.answer],
      pts,
      combo: comboRef.current,
    })
    window.setTimeout(() => {
      if (qi + 1 >= mcs.length) onComplete(next)
      else {
        setFlash(null)
        setQi(qi + 1)
      }
    }, 1000)
  }

  function whack(m: Mole) {
    if (lockRef.current) return
    resolve(m.bomb ? false : m.correct, m.bomb)
  }

  if (!problem) return null
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
        {combo >= 2 && <span className="combo-chip">🔥 {combo} COMBO</span>}
        <span className="ox-score">💎 {gained}</span>
        <span className={`timer ${time <= 4 ? 'danger' : ''}`}>⏱ {time}s</span>
      </div>

      <p className="rain-question">{problem.prompt}</p>
      <p className="rain-hint">정답 두더지를 콩! 🔨 (💣 폭탄은 피해요)</p>

      <div className="mole-grid">
        {Array.from({ length: HOLES }, (_, h) => {
          const m = moleAt(h)
          return (
            <div key={h} className="mole-hole">
              {m && (
                <button
                  className={`mole ${m.bomb ? 'mole-bomb' : ''} ${
                    flash && !m.bomb ? (m.correct ? 'reveal-ok' : 'reveal-no') : ''
                  }`}
                  onClick={() => whack(m)}
                  disabled={!!flash}
                >
                  {m.bomb ? (
                    <span className="mole-face">💣</span>
                  ) : (
                    <>
                      <span className="mole-face">🦔</span>
                      <span className="mole-label">{m.choiceIdx + 1}. {problem.choices[m.choiceIdx]}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {flash && (
        <div className={`feedback ${flash.kind === 'good' ? 'good' : 'bad'}`}>
          <div className="feedback-head">
            {flash.kind === 'good'
              ? `정답! 🎉 +${flash.pts}${flash.combo >= 2 ? `  🔥${flash.combo} 콤보` : ''}`
              : flash.kind === 'bomb'
                ? '💥 폭탄! 정답은 ' + flash.answer
                : `아쉬워요 — 정답: ${flash.answer}`}
          </div>
          {problem.explanation && <div className="explain">📘 {problem.explanation}</div>}
        </div>
      )}
    </div>
  )
}
