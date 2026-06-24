import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem, MultipleChoiceProblem } from '../types/problem'
import type { GameResult } from './SpeedOxGame'
import { GameFrame } from './GameFrame'
import { TimerRing } from './TimerRing'
import { Monster, type MonsterMood } from './battle/Monster'
import { computeScore } from '../game/gamification'
import { useRaf } from '../lib/useRaf'
import {
  playWrong, playBomb, playHit, playCrit, playVictory, playDefeat, playTick, playGo, vibrate,
} from '../lib/juice'

interface Props {
  problems: Problem[]
  theme?: string
  avatar?: string
  onComplete: (results: GameResult[]) => void
  onExit?: () => void
}

const PLAYER_HP = 3
const PER_SEC = 14
const CRIT_AT = 3 // 콤보 3 이상 크리티컬(2배 데미지)

interface Flash { ok: boolean; crit: boolean; dmg: number; answer: number }
interface Fx { key: number; pts: number; crit: boolean }

// ⚔️ 마법 배틀 — 정답으로 마법 공격, 콤보로 크리티컬, 오답/시간초과는 보스의 반격.
export function BossGame({ problems, theme, avatar = '🧙', onComplete, onExit }: Props) {
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
  const [t, setT] = useState(PER_SEC)
  const [picked, setPicked] = useState<number | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [fx, setFx] = useState<Fx | null>(null)
  const [mood, setMood] = useState<MonsterMood>('idle')
  const [shake, setShake] = useState(false)
  const [hpHit, setHpHit] = useState(false)
  const [casting, setCasting] = useState(0) // 발사체 트리거 key
  const [burst, setBurst] = useState(0) // 타격 파티클 트리거 key
  const [burstCrit, setBurstCrit] = useState(false)
  const [ending, setEnding] = useState<null | 'win' | 'lose'>(null)
  const [count, setCount] = useState(3) // 3,2,1,0(FIGHT)
  const [armed, setArmed] = useState(false)

  const bossHpRef = useRef(maxHp)
  const playerHpRef = useRef(PLAYER_HP)
  const comboRef = useRef(0)
  const gainedRef = useRef(0)
  const resultsRef = useRef<GameResult[]>([])
  const lockRef = useRef(false)
  const tRef = useRef(PER_SEC)
  const fxKey = useRef(0)
  const problem = mcs[qi]

  useEffect(() => {
    if (mcs.length === 0) onComplete([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 시작 카운트다운 3 → 2 → 1 → FIGHT!
  useEffect(() => {
    if (mcs.length === 0) return
    const seq = [3, 2, 1, 0]
    let i = 0
    let id: number
    const tick = () => {
      setCount(seq[i])
      seq[i] === 0 ? playGo() : playTick()
      if (seq[i] === 0) { id = window.setTimeout(() => setArmed(true), 550); return }
      i++
      id = window.setTimeout(tick, 600)
    }
    id = window.setTimeout(tick, 250)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 문제 바뀌면 타이머 리셋
  useEffect(() => {
    if (!problem) return
    lockRef.current = false
    setPicked(null)
    tRef.current = PER_SEC
    setT(PER_SEC)
  }, [qi, problem])

  // 부드러운 제한 시간 (전투 중에만)
  const ticking = armed && !!problem && !flash && !ending
  useRaf(ticking, (dt) => {
    tRef.current -= dt
    if (tRef.current <= 0) {
      tRef.current = 0
      setT(0)
      answer(-1)
      return
    }
    setT(tRef.current)
  })

  function answer(idx: number) {
    if (lockRef.current || !problem || !armed || ending) return
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
      const pts = computeScore({ basePoints: problem.points, combo: comboRef.current })
      gainedRef.current += pts
      fxKey.current += 1
      setCasting((c) => c + 1) // 마법 발사
      // 발사체가 도착할 즈음 타격 연출
      window.setTimeout(() => {
        setMood('hurt')
        setHpHit(true)
        setBurstCrit(crit)
        setBurst((b) => b + 1)
        setFx({ key: fxKey.current, pts, crit })
        crit ? playCrit() : playHit()
        vibrate(crit ? [30, 20, 50] : 20)
        window.setTimeout(() => { setMood('idle'); setHpHit(false) }, 420)
      }, 280)
    } else {
      comboRef.current = 0
      playerHpRef.current -= 1
      setMood('charge')
      idx === -1 ? playBomb() : playWrong()
      vibrate([40, 30, 40])
      window.setTimeout(() => {
        setMood('attack')
        setShake(true)
        window.setTimeout(() => setShake(false), 420)
        window.setTimeout(() => setMood('idle'), 420)
      }, 240)
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
      if (win) { setMood('dead'); setEnding('win'); playVictory(); return }
      if (dead) { setEnding('lose'); playDefeat(); return }
      if (qi + 1 >= mcs.length) { onComplete(resultsRef.current); return }
      setFlash(null)
      setFx(null)
      setQi(qi + 1)
    }, 1100)
  }

  if (!problem) return null
  const hpRatio = maxHp ? bossHp / maxHp : 0
  const comboTier = combo >= 6 ? 'tier3' : combo >= CRIT_AT ? 'tier2' : 'tier1'

  return (
    <GameFrame
      theme={theme}
      className={`boss-game ${shake ? 'shake' : ''}`}
      onExit={onExit}
      progress={`${Math.min(qi + 1, mcs.length)} / ${mcs.length}`}
      headerExtra={
        <>
          {combo >= 2 && <span className={`combo-chip ${comboTier}`}>🔥 {combo} COMBO</span>}
          <span className="gf-lives">{'❤️'.repeat(Math.max(0, playerHp))}</span>
          <TimerRing ratio={t / PER_SEC} label={Math.ceil(t)} danger={t <= 4} size={48} />
        </>
      }
    >
      {/* ── 배틀 아레나 ── */}
      <div className={`battle-scene ${ending ? `end-${ending}` : ''}`}>
        <div className="bt-stars" aria-hidden />
        {/* 보스 */}
        <div className="bt-boss-wrap">
          <div className="boss-hpbar">
            <div className={`boss-hpbar-fill ${hpHit ? 'hit' : ''}`} style={{ width: `${hpRatio * 100}%` }} />
            <span className="boss-hpbar-text">BOSS {bossHp}/{maxHp}</span>
          </div>
          <div className="bt-monster">
            <Monster hpRatio={hpRatio} mood={mood} />
            {burst > 0 && (
              <div key={burst} className={`impact ${burstCrit ? 'crit' : ''}`} aria-hidden>
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className="spark" style={{ ['--a' as string]: `${i * 45}deg` }} />
                ))}
                <span className="impact-ring" />
              </div>
            )}
            {fx && (
              <div key={fx.key} className={`dmg-pop ${fx.crit ? 'crit' : ''}`} aria-hidden>
                {fx.crit ? `CRITICAL! +${fx.pts}` : `+${fx.pts}`}
              </div>
            )}
            {ending === 'win' && (
              <div className="boom" aria-hidden>
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className="boom-bit" style={{ ['--a' as string]: `${i * 30}deg` }} />
                ))}
                <span className="boom-flash">💥</span>
              </div>
            )}
          </div>
        </div>

        {/* 영웅 + 발사체 */}
        <div className={`bt-hero ${casting ? 'cast' : ''}`}>
          <span className="hero-avatar">{avatar}</span>
          <span className="hero-base" />
        </div>
        {casting > 0 && !ending && <span key={casting} className="spell-orb" aria-hidden />}

        {/* 종료 배너 */}
        {ending === 'win' && (
          <div className="bt-banner win">
            <div className="bt-banner-title">VICTORY!</div>
            <div className="bt-banner-sub">💎 {gained} 획득 · 🔥 최고 {combo} 콤보</div>
            <button className="btn primary" onClick={() => onComplete(resultsRef.current)}>전리품 받기 ▶</button>
          </div>
        )}
        {ending === 'lose' && (
          <div className="bt-banner lose">
            <div className="bt-banner-title">패배… 💀</div>
            <div className="bt-banner-sub">보스 체력 {bossHp}/{maxHp} · 거의 다 왔어요!</div>
            <button className="btn primary" onClick={() => onComplete(resultsRef.current)}>결과 보기 ▶</button>
          </div>
        )}

        {/* 시작 카운트다운 */}
        {!armed && (
          <div className="bt-count" aria-hidden>
            <span key={count} className={count === 0 ? 'cd-go' : 'cd-num'}>{count === 0 ? 'FIGHT!' : count}</span>
          </div>
        )}
      </div>

      {/* ── 문제 ── */}
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
            <button key={i} className={cls} disabled={!!flash || !armed || !!ending} onClick={() => answer(i)}>
              <span className="choice-num">{i + 1}</span> {c}
            </button>
          )
        })}
      </div>
      <p className="boss-foot">⚔️ 정답=마법 · 🔥콤보 {CRIT_AT}+ 크리티컬 · 💎 {gained}</p>
    </GameFrame>
  )
}
