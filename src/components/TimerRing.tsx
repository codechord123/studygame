interface Props {
  /** 남은 비율 0~1 */
  ratio: number
  /** 가운데 표시할 라벨(보통 남은 초) */
  label?: string | number
  size?: number
  danger?: boolean
}

// 미니게임 공용 카운트다운 링 — 부드럽게 줄어드는 원형 게이지.
export function TimerRing({ ratio, label, size = 56, danger }: Props) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, ratio))
  return (
    <div className={`timer-ring ${danger ? 'danger' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="tr-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={6} fill="none" />
        <circle
          className="tr-bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label != null && <span className="tr-label">{label}</span>}
    </div>
  )
}
