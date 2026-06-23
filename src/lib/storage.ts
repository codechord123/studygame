import type { Problem } from '../types/problem'
import { emptyProfile, type PlayerProfile } from '../game/gamification'

// 영속성 추상화 계층.
// 지금은 localStorage 구현만 있지만, 같은 인터페이스로 FirebaseStore 를 만들어
// 끼워넣으면 화면 코드는 그대로 둔 채 클라우드 동기화로 전환할 수 있다.
//   예) export const store: Store = USE_FIREBASE ? firebaseStore : localStore

export interface WrongNote {
  problem: Problem
  userResponses: string[]
  wrongAt: number // timestamp
  resolved: boolean // 오답노트에서 다시 풀어 맞혔는지
}

export interface Store {
  loadProfile(): Promise<PlayerProfile>
  saveProfile(p: PlayerProfile): Promise<void>
  loadWrongNotes(): Promise<WrongNote[]>
  /** 같은 문제 id면 덮어쓴다 */
  upsertWrongNote(note: WrongNote): Promise<void>
  markResolved(problemId: string): Promise<void>
}

const PROFILE_KEY = 'sg.profile.v1'
const WRONG_KEY = 'sg.wrongnotes.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 용량 초과 등은 조용히 무시 */
  }
}

export const localStore: Store = {
  async loadProfile() {
    return read<PlayerProfile>(PROFILE_KEY, emptyProfile)
  },
  async saveProfile(p) {
    write(PROFILE_KEY, p)
  },
  async loadWrongNotes() {
    return read<WrongNote[]>(WRONG_KEY, [])
  },
  async upsertWrongNote(note) {
    const notes = read<WrongNote[]>(WRONG_KEY, [])
    const idx = notes.findIndex((n) => n.problem.id === note.problem.id)
    if (idx >= 0) notes[idx] = note
    else notes.push(note)
    write(WRONG_KEY, notes)
  },
  async markResolved(problemId) {
    const notes = read<WrongNote[]>(WRONG_KEY, [])
    const idx = notes.findIndex((n) => n.problem.id === problemId)
    if (idx >= 0) {
      notes[idx].resolved = true
      write(WRONG_KEY, notes)
    }
  },
}

// 화면 코드는 항상 이 `store` 만 사용한다.
export const store: Store = localStore
