import { useEffect, useState } from 'react'
import { playTick, playGo } from '../lib/sfx'

interface Props {
  onDone: () => void
  go?: string // 마지막 글자(기본 'GO!')
}

// 미니게임 공용 시작 카운트다운 — 3 · 2 · 1 · GO! 오버레이.
// GameFrame(.game-frame, position:relative) 안에 덮어 렌더한다.
export function CountdownIntro({ onDone, go = 'GO!' }: Props) {
  const [step, setStep] = useState(3) // 3,2,1,0(GO)
  useEffect(() => {
    const seq = [3, 2, 1, 0]
    let i = 0
    let id: number
    const tick = () => {
      setStep(seq[i])
      seq[i] === 0 ? playGo() : playTick()
      if (seq[i] === 0) {
        id = window.setTimeout(onDone, 430)
        return
      }
      i++
      id = window.setTimeout(tick, 600)
    }
    id = window.setTimeout(tick, 250)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="countdown-intro" aria-hidden>
      <span key={step} className={step === 0 ? 'ci-go' : 'ci-num'}>
        {step === 0 ? go : step}
      </span>
    </div>
  )
}
