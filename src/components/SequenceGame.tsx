import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem, SequenceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'
import { GameFrame } from './GameFrame'
import { TimerRing } from './TimerRing'
import { computeScore } from '../game/gamification'
import { useRaf } from '../lib/useRaf'
import { playCorrect, playWrong, playCombo, playWhoosh, playPop } from '../lib/sfx'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

const PER_SEC = 24
const START_LIVES = 3

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Fx { key: number; pts: number; tag: string | null }

// 🔢 순서대로 줄줄이 — 섞인 단계 카드를 올바른 순서로 배열하는 미니게임.
export function SequenceGame({ problems, theme, onComplete, onExit }: Props) {
  const rounds = useMemo(
    () => problems.filter((p): p is SequenceProblem => p.type === 'sequence'),
    [problems],
  )
  const [qi, setQi] = useState(0)
  const problem = rounds[qi]
  const n = problem?.steps.length ?? 0

  // bank: 섞인 단계 카드들. slots: 자리별 'bank 배열 위치 인덱스' or null (일관 추적)
  const bank = useMemo(() => (problem ? shuffle(problem.steps.map((t, i) => ({ t, key: i }))) : []), [problem])
  const [slots, setSlots] = useState<(number | null)[]>(() => Array(n).fill(null))
  const [checking, setChecking] = useState<null | boolean[]>(null) // 자리별 정답 여부
  const [t, setT] = useState(PER_SEC)
  const [lives, setLives] = useState(START_LIVES)
  const [lifeLost, setLifeLost] = useState(false)
  const [combo, setCombo] = useState(0)
  const [gained, setGained] = useState(0)
  const [shake, setShake] = useState(false)
  const [fx, setFx] = useState<Fx | null>(null)

  const tRef = useRef(PER_SEC)
  const livesRef = useRef(START_LIVES)
  const comboRef = useRef(0)
  const gainedRef = useRef(0)
  const resultsRef = useRef<GameResult[]>([])
  const lockRef = useRef(false)
  const fxKey = useRef(0)

  useEffect(() => {
    if (rounds.length === 0) onComplete([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 라운드 바뀌면 초기화
  useEffect(() => {
    setSlots(Array(n).fill(null))
    setChecking(null)
    tRef.current = PER_SEC
    setT(PER_SEC)
    lockRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, n])

  const ticking = !!problem && !checking && livesRef.current > 0
  useRaf(ticking, (dt) => {
    tRef.current -= dt
    if (tRef.current <= 0) {
      tRef.current = 0
      setT(0)
      check(true)
      return
    }
    setT(tRef.current)
  })

  if (!problem) return null

  const usedSet = new Set(slots.filter((s): s is number => s !== null))
  const allFilled = slots.every((s) => s !== null)

  function place(bankPos: number) {
    if (checking || usedSet.has(bankPos)) return
    const at = slots.findIndex((s) => s === null)
    if (at < 0) return
    const next = [...slots]
    next[at] = bankPos
    setSlots(next)
    playWhoosh()
  }
  function removeAt(i: number) {
    if (checking || slots[i] === null) return
    const next = [...slots]
    next[i] = null
    setSlots(next)
    playPop()
  }

  function check(timeout = false) {
    if (lockRef.current) return
    lockRef.current = true
    const perSlot = problem.steps.map((step, i) => {
      const b = slots[i]
      return b !== null && bank[b].t === step
    })
    const ok = !timeout && perSlot.every(Boolean)
    setChecking(perSlot)

    if (ok) {
      comboRef.current += 1
      const ratio = Math.max(0, tRef.current) / PER_SEC
      const pts = computeScore({ basePoints: problem.points, combo: comboRef.current, timeLeftRatio: ratio })
      gainedRef.current += pts
      fxKey.current += 1
      setFx({ key: fxKey.current, pts, tag: comboRef.current >= 2 ? `🔥 ${comboRef.current} 연속` : null })
      comboRef.current >= 2 ? playCombo(comboRef.current) : playCorrect()
    } else {
      comboRef.current = 0
      livesRef.current -= 1
      setLifeLost(true)
      window.setTimeout(() => setLifeLost(false), 500)
      setShake(true)
      window.setTimeout(() => setShake(false), 420)
      playWrong()
    }
    setCombo(comboRef.current)
    setGained(gainedRef.current)
    setLives(livesRef.current)
    resultsRef.current = [...resultsRef.current, { id: problem.id, correct: ok }]

    window.setTimeout(() => {
      if (livesRef.current <= 0 || qi + 1 >= rounds.length) {
        onComplete(resultsRef.current)
        return
      }
      setFx(null)
      setQi(qi + 1)
    }, ok ? 950 : 1500)
  }

  const comboTier = combo >= 6 ? 'tier3' : combo >= 4 ? 'tier2' : 'tier1'
  // 정답 공개(오답 시): 올바른 순서 텍스트
  const revealing = checking && !checking.every(Boolean)

  return (
    <GameFrame
      theme={theme}
      className={`seq-game ${shake ? 'shake' : ''}`}
      onExit={onExit}
      progress={`${qi + 1} / ${rounds.length}`}
      headerExtra={
        <>
          <span className="ox-score">💎 {gained}</span>
          {combo >= 2 && <span className={`combo-chip ${comboTier}`}>🔥 {combo} COMBO</span>}
          <span className={`gf-lives ${lifeLost ? 'lost' : ''}`}>{'❤️'.repeat(Math.max(0, lives))}</span>
          <TimerRing ratio={t / PER_SEC} label={Math.ceil(t)} danger={t <= 5} size={46} />
        </>
      }
    >
      {fx && (
        <div key={fx.key} className="fx-pop" aria-hidden>
          <span className="fx-pts">+{fx.pts}</span>
          {fx.tag && <span className="fx-tag">{fx.tag}</span>}
        </div>
      )}

      <p className="seq-prompt">{problem.prompt}</p>

      {/* 세로 타임라인 슬롯 */}
      <div className="seq-track">
        {slots.map((b, i) => {
          const state = checking ? (checking[i] ? 'ok' : 'no') : b !== null ? 'filled' : 'empty'
          return (
            <div key={i} className={`seq-slot ${state}`}>
              <span className="seq-num">{i + 1}</span>
              {b !== null ? (
                <button className="seq-card" onClick={() => removeAt(i)} disabled={!!checking}>
                  {revealing ? problem.steps[i] : bank[b].t}
                </button>
              ) : (
                <span className="seq-blank">여기에 놓기</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 카드 뱅크 */}
      <div className="seq-bank">
        {bank.map((card, pos) => {
          const used = usedSet.has(pos)
          return (
            <button
              key={card.key}
              className={`seq-chip ${used ? 'used' : ''}`}
              onClick={() => place(pos)}
              disabled={used || !!checking}
            >
              {card.t}
            </button>
          )
        })}
      </div>

      {!checking ? (
        <button className="btn primary submit" disabled={!allFilled} onClick={() => check()}>
          {allFilled ? '확인 ✓' : '카드를 순서대로 놓아요'}
        </button>
      ) : (
        <div className={`feedback ${checking.every(Boolean) ? 'good' : 'bad'}`}>
          <div className="feedback-head">{checking.every(Boolean) ? '정답! 🎉' : '아쉬워요 — 정답 순서를 확인해요'}</div>
          {problem.explanation && <div className="explain">📘 {problem.explanation}</div>}
        </div>
      )}
    </GameFrame>
  )
}
