// 진행 데이터 백업/복원 — localStorage 의 모든 게임 키를 하나의 코드로 묶고 되돌린다.
// 기기 변경·캐시 삭제로 인한 진행 유실을 막기 위한 안전장치(클라우드 동기화가 없을 때의 최소 대비).

// 백업 대상 키: 새 키가 생기면 여기에 추가한다.
const KEYS = [
  'sg.profile.v1',
  'sg.wrongnotes.v1',
  'sg.custom.v1',
  'sg.outfits',
  'sg.guestbook.v1',
  'sg.carrots',
  'sg.muted',
] as const

interface BackupPayload {
  app: 'byeolsup'
  v: 1
  at: number
  data: Record<string, unknown>
}

// 유니코드 안전 base64 (한글 포함)
function toB64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}
function fromB64(s: string): string {
  return decodeURIComponent(escape(atob(s)))
}

/** 현재 진행을 백업 코드 문자열로 만든다. at(타임스탬프)은 호출부에서 주입(테스트·결정성). */
export function makeBackup(at: number): string {
  const data: Record<string, unknown> = {}
  for (const k of KEYS) {
    const raw = localStorage.getItem(k)
    if (raw == null) continue
    try {
      data[k] = JSON.parse(raw)
    } catch {
      data[k] = raw // 숫자/문자열 등 비 JSON 값
    }
  }
  const payload: BackupPayload = { app: 'byeolsup', v: 1, at, data }
  return 'BYEOLSUP1-' + toB64(JSON.stringify(payload))
}

export interface RestoreResult {
  ok: boolean
  error?: string
  keys?: number
  at?: number
}

/** 백업 코드를 검증만 한다(쓰지 않음). 미리보기용. */
export function inspectBackup(code: string): RestoreResult {
  try {
    const trimmed = code.trim().replace(/^BYEOLSUP1-/, '')
    const payload = JSON.parse(fromB64(trimmed)) as BackupPayload
    if (payload.app !== 'byeolsup' || !payload.data) return { ok: false, error: '형식이 올바르지 않아요.' }
    return { ok: true, keys: Object.keys(payload.data).length, at: payload.at }
  } catch {
    return { ok: false, error: '백업 코드를 읽을 수 없어요.' }
  }
}

/** 백업 코드로 진행을 되돌린다. 성공 시 호출부에서 새로고침 권장. */
export function restoreBackup(code: string): RestoreResult {
  const info = inspectBackup(code)
  if (!info.ok) return info
  try {
    const trimmed = code.trim().replace(/^BYEOLSUP1-/, '')
    const payload = JSON.parse(fromB64(trimmed)) as BackupPayload
    let n = 0
    for (const [k, v] of Object.entries(payload.data)) {
      if (!KEYS.includes(k as (typeof KEYS)[number])) continue
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
      n++
    }
    return { ok: true, keys: n, at: payload.at }
  } catch {
    return { ok: false, error: '복원 중 문제가 생겼어요.' }
  }
}
