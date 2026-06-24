// 모션·연출 — 외부 CSS 의존 없이 Web Animations API 로 동작하는 재사용 헬퍼.
// 모두 prefers-reduced-motion 을 존중하고, 서버/비브라우저 환경에서 안전하다.

function reduceMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** 진동(햅틱) — 모바일 지원 시. 데스크톱/미지원은 무시 */
export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* 미지원 환경 무시 */
  }
}

/** 히트스톱 — 짧은 정지로 타격감을 강조 (await hitStop()) */
export function hitStop(ms = 80): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** 스크린/요소 셰이크 */
export function shake(el: HTMLElement | null | undefined, intensity = 6, ms = 400) {
  if (!el || reduceMotion()) return
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: `translateX(${-intensity}px)` },
      { transform: `translateX(${intensity}px)` },
      { transform: `translateX(${-intensity * 0.6}px)` },
      { transform: `translateX(${intensity * 0.6}px)` },
      { transform: 'translateX(0)' },
    ],
    { duration: ms, easing: 'ease-in-out' },
  )
}

/** 전체화면 플래시 — 정답 초록 / 오답 빨강 등 */
export function flash(color = 'rgba(36,163,90,0.30)', ms = 320) {
  if (typeof document === 'undefined' || reduceMotion()) return
  const el = document.createElement('div')
  Object.assign(el.style, {
    position: 'fixed',
    inset: '0',
    background: color,
    pointerEvents: 'none',
    zIndex: '9999',
    opacity: '0',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(el)
  el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], {
    duration: ms,
    easing: 'ease-out',
  }).finished
    .catch(() => {})
    .finally(() => el.remove())
}

/** 등장 팝(스쿼시 & 스트레치) */
export function popIn(el: HTMLElement | null | undefined, ms = 320) {
  if (!el || reduceMotion()) return
  el.animate(
    [
      { transform: 'scale(0.6)', opacity: 0 },
      { transform: 'scale(1.12)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { duration: ms, easing: 'cubic-bezier(.34,1.56,.64,1)' },
  )
}

/** 폭죽 파티클 버스트 — 기본 화면 상단 중앙. DOM 자동 정리 */
export function burstConfetti(
  opts: { x?: number; y?: number; count?: number; colors?: string[] } = {},
) {
  if (typeof document === 'undefined' || reduceMotion()) return
  const { count = 16, colors = ['#ff5e7e', '#ffd34d', '#4dd0a0', '#5b9dff', '#c77dff'] } = opts
  const x = opts.x ?? window.innerWidth / 2
  const y = opts.y ?? window.innerHeight * 0.35
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    const size = 6 + Math.random() * 6
    Object.assign(p.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      background: colors[i % colors.length],
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      pointerEvents: 'none',
      zIndex: '9999',
    } as Partial<CSSStyleDeclaration>)
    document.body.appendChild(p)
    const ang = Math.random() * Math.PI * 2
    const dist = 60 + Math.random() * 120
    const dx = Math.cos(ang) * dist
    const dy = Math.sin(ang) * dist + 80 // 약간 아래로 떨어지는 중력감
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        {
          transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 720 - 360}deg)`,
          opacity: 0,
        },
      ],
      { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.2,.6,.3,1)' },
    ).finished
      .catch(() => {})
      .finally(() => p.remove())
  }
}
