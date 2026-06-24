import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'
import { GameFrame } from './GameFrame'
import { computeScore } from '../game/gamification'
import { playCorrect, playWrong, playCombo, playBomb } from '../lib/sfx'

interface Props {
  problems: Problem[]
  theme?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

const PLAYER_HP = 3
const PER_SEC = 14
const CRIT_AT = 3 // 콤보 3 이상이면 크리티컬(2배 데미지)

function bossFace(ratio: number): string {
  if (ratio > 0.66) return '👹'
  if (ratio > 0.33) return '👺'
  if (ratio > 0) return '😈'
  return '💥'
}

// 정답으로 보스에게 데미지, 콤보로 크리티컬, 오답/시간초과는 보스의 반격(생명 감소).
export function BossGame({ problems, theme, onComplete, onExit }: Props) {
  const mcs = useMemo(
    () => problems.filter((p): p is MultipleChoiceProblem => p.type === 'multiple_choice'),
    [problems],
  )
  const maxHp = mcs.length
  const [qi, setQi] = useState(0)
  const [bossHp, setBossHp] = useState(maxHp)
  const [playerHp, setPlayerHp] = useState(PLAYER_HP)
  const [combo, setCombo] = useState(0)
  const [gained, setGained] = useState(0)
  const [time, setTime] = useState(PER_SEC)
  const [picked, setPicked] = useState<number | null>(null)
  const [flash, setFlash] = useState<null | { ok: boolean; crit: boolean; dmg: number; answer: number }>(null)
  const [shake, setShake] = useState(false)

  const bossHpRef = useRef(maxHp)
  const playerHpRef = useRef(PLAYER_HP)
  const comboRef = useRef(0)
  const gainedRef = useRef(0)
  const resultsRef = useRef<GameResult[]>([])
  const lockRef = useRef(false)
  const problem = mcs[qi]

  useEffect(() => {
    if (mcs.length === 0) onComplete([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 문제 바뀌면 타이머 리셋
  useEffect(() => {
    if (!problem) return
    lockRef.current = false
    setPicked(null)
    setTime(PER_SEC)
  }, [qi, problem])

  // 제한 시간 (풀이 중에만)
  useEffect(() => {
    if (!problem || flash) return
    if (time <= 0) {
      answer(-1)
      return
    }
    const t = window.setTimeout(() => setTime((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, problem, flash])

  function answer(idx: number) {
    if (lockRef.current || !problem) return
    lockRef.current = true
    setPicked(idx)
    const ok = idx === problem.answer
    let dmg = 0
    let crit = false
    if (ok) {
      comboRef.current += 1
      crit = comboRef.current >= CRIT_AT
      dmg = crit ? 2 : 1
      bossHpRef.current = Math.max(0, bossHpRef.current - dmg)
      gainedRef.current += computeScore({ basePoints: problem.points, combo: comboRef.current })
      crit ? playCombo(comboRef.current) : playCorrect()
    } else {
      comboRef.current = 0
      playerHpRef.current -= 1
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
      idx === -1 ? playBomb() : playWrong()
    }
    setBossHp(bossHpRef.current)
    setPlayerHp(playerHpRef.current)
    setCombo(comboRef.current)
    setGained(gainedRef.current)
    resultsRef.current = [...resultsRef.current, { id: problem.id, correct: ok }]
    setFlash({ ok, crit, dmg, answer: problem.answer })

    window.setTimeout(() => {
      const win = bossHpRef.current <= 0
      const dead = playerHpRef.current <= 0
      if (win || dead || qi + 1 >= mcs.length) {
        onComplete(resultsRef.current)
        return
      }
      setFlash(null)
      setQi(qi + 1)
    }, 1050)
  }

  if (!problem) return null
  const hpRatio = maxHp ? bossHp / maxHp : 0

  return (
    <GameFrame
      theme={theme}
      className={`boss-game ${shake ? 'shake' : ''}`}
      onExit={onExit}
      progress={`${qi + 1} / ${mcs.length}`}
      combo={combo}
      lives={playerHp}
      time={time}
      timeDanger={time <= 4}
    >
      <div className="boss-stage">
        <div className={`boss-face ${flash?.ok ? 'hurt' : ''}`}>{bossFace(hpRatio)}</div>
        <div className="boss-hp">
          <div className="boss-hp-fill" style={{ width: `${hpRatio * 100}%` }} />
          <span className="boss-hp-text">{bossHp} / {maxHp}</span>
        </div>
        {flash && (
          <div className={`boss-dmg ${flash.ok ? (flash.crit ? 'crit' : 'hit') : 'block'}`}>
            {flash.ok ? (flash.crit ? `CRITICAL! -${flash.dmg}` : `-${flash.dmg}`) : '반격! 💢'}
          </div>
        )}
      </div>

      <p className="boss-q">{problem.prompt}</p>
      <div className="choices boss-choices">
        {problem.choices.map((c, i) => {
          const isAns = i === problem.answer
          const isPick = i === picked
          let cls = 'choice'
          if (flash) {
            if (isAns) cls += ' correct'
            else if (isPick) cls += ' wrong'
          }
          return (
            <button key={i} className={cls} disabled={!!flash} onClick={() => answer(i)}>
              <span className="choice-num">{i + 1}</span> {c}
            </button>
          )
        })}
      </div>
      <p className="boss-foot">⚔️ 정답 데미지 · 🔥콤보 {CRIT_AT}+ 크리티컬 · 💎 {gained}</p>
    </GameFrame>
  )
}
