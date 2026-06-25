// useJuice — 사운드 + 모션 + 햅틱을 한 번에 묶어 호출하는 React 훅.
// 예) const juice = useJuice(); juice.correct(btnEl, 10)

import { useMemo } from 'react'
import * as sfx from './sfx'
import { shake, flash, vibrate, burstConfetti, hitStop, popIn } from './effects'
import { floatText, floatTextAt } from './floatText'

export function useJuice() {
  return useMemo(
    () => ({
      /** 정답: 정답음 + 초록 플래시 + 진동 + (요소 팝 + 플로팅 점수) */
      correct(target?: HTMLElement, points?: number) {
        sfx.playCorrect()
        vibrate(20)
        flash('rgba(36,163,90,0.30)')
        if (target) {
          popIn(target)
          if (points != null) floatTextAt(target, `+${points}`, { color: '#1f8f4e' })
        }
      },
      /** 오답: 오답음 + 빨강 플래시 + 진동 + (요소 셰이크) */
      wrong(target?: HTMLElement) {
        sfx.playWrong()
        vibrate([40, 30, 40])
        flash('rgba(214,40,57,0.28)')
        if (target) shake(target)
      },
      /** 콤보: 음정 상승음 + (요소 위 플로팅 콤보) */
      combo(n: number, target?: HTMLElement) {
        sfx.playCombo(n)
        if (target) floatTextAt(target, `🔥 ${n} COMBO`, { color: '#ff7a3c', size: 20 })
      },
      /** 승리: 팡파르 + 폭죽 */
      win() {
        sfx.playVictory()
        burstConfetti()
      },
      // 개별 헬퍼도 그대로 노출
      shake,
      flash,
      vibrate,
      hitStop,
      popIn,
      burstConfetti,
      floatText,
      floatTextAt,
    }),
    [],
  )
}
