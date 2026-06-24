import type { ReactNode } from 'react'

interface Props {
  theme?: string
  className?: string
  onExit?: () => void
  progress?: string // "3 / 10"
  combo?: number
  lives?: number | null
  time?: number | null
  timeDanger?: boolean
  headerExtra?: ReactNode
  children: ReactNode
}

// 모든 미니게임이 공유하는 프레임: 상단 메타(진행·콤보·생명·타이머) + 플레이 영역.
// 시각/구조 일관성과 재사용을 위해 헤더를 한 곳에 모은다.
export function GameFrame({
  theme,
  className,
  onExit,
  progress,
  combo = 0,
  lives = null,
  time = null,
  timeDanger,
  headerExtra,
  children,
}: Props) {
  return (
    <div className={`card game-frame ${className ?? ''} ${theme ?? ''}`}>
      <div className="q-meta">
        {onExit && (
          <button className="q-exit" onClick={onExit}>
            ← 나가기
          </button>
        )}
        {progress && <span className="q-progress">{progress}</span>}
        {headerExtra}
        {combo >= 2 && <span className="combo-chip">🔥 {combo} COMBO</span>}
        {lives != null && <span className="gf-lives">{'❤️'.repeat(Math.max(0, lives))}</span>}
        {time != null && <span className={`timer ${timeDanger ? 'danger' : ''}`}>⏱ {time}s</span>}
      </div>
      {children}
    </div>
  )
}
