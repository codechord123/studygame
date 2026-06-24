// 플로팅 텍스트 — +점수·콤보 등이 솟아오르며 사라지는 연출. 명령형 호출(어디서나).

function reduceMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export interface FloatTextOpts {
  color?: string
  size?: number
  ms?: number
}

/** 뷰포트 좌표(px)에 플로팅 텍스트 생성. DOM 자동 정리 */
export function floatText(text: string, x: number, y: number, opts: FloatTextOpts = {}) {
  if (typeof document === 'undefined') return
  const { color = '#ffd34d', size = 24, ms = 800 } = opts
  const el = document.createElement('span')
  el.textContent = text
  Object.assign(el.style, {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%,-50%)',
    color,
    fontSize: `${size}px`,
    fontWeight: '900',
    pointerEvents: 'none',
    zIndex: '9999',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(el)
  const frames: Keyframe[] = reduceMotion()
    ? [{ opacity: 1 }, { opacity: 0 }]
    : [
        { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%,-90%) scale(1.1)', opacity: 1, offset: 0.3 },
        { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 },
      ]
  el.animate(frames, { duration: ms, easing: 'ease-out' }).finished
    .catch(() => {})
    .finally(() => el.remove())
}

/** 요소의 중심 좌표에 플로팅 텍스트 */
export function floatTextAt(target: HTMLElement, text: string, opts?: FloatTextOpts) {
  const r = target.getBoundingClientRect()
  floatText(text, r.left + r.width / 2, r.top + r.height / 2, opts)
}
