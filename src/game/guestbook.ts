// 친구 집 방명록. 기본은 localStorage 에 저장(오프라인에서도 내 응원이 남음).
// Firebase 연동 시 store.loadGuestbook/postGuestbook 가 우선 사용된다.

export interface GuestEntry {
  from: string
  text: string
  at: number
}

const KEY = 'sg.guestbook.v1'

function readAll(): Record<string, GuestEntry[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}
function writeAll(data: Record<string, GuestEntry[]>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* 무시 */
  }
}

export function loadLocalGuestbook(ownerId: string): GuestEntry[] {
  return readAll()[ownerId] ?? []
}

export function postLocalGuestbook(ownerId: string, entry: GuestEntry) {
  const all = readAll()
  const list = all[ownerId] ?? []
  list.unshift(entry)
  all[ownerId] = list.slice(0, 30)
  writeAll(all)
}

// 미리 채워둔 따뜻한 응원(처음 방문해도 비어있지 않게)
export const SEED_CHEERS: GuestEntry[] = [
  { from: '글봄', text: '집 정말 아늑하다! 또 놀러 올게 🦉', at: 0 },
  { from: '도윤', text: '같이 공부해서 좋았어 💪', at: 0 },
]
