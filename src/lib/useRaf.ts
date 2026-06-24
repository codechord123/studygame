import { useEffect, useRef } from 'react'

// requestAnimationFrame 루프 표준화 — active 동안 매 프레임 onFrame(dt초) 호출,
// 언마운트/비활성 시 자동 정리(타이머 누수 방지). dt는 0.05초로 상한(탭 비활성 복귀 대비).
export function useRaf(active: boolean, onFrame: (dt: number) => void) {
  const cbRef = useRef(onFrame)
  cbRef.current = onFrame
  useEffect(() => {
    if (!active) return
    let raf = 0
    let last = 0
    const tick = (ts: number) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0
      last = ts
      cbRef.current(dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
}
