import type { Problem } from '../types/problem'
import { emptyProfile, type PlayerProfile } from '../game/gamification'
import type { RankEntry } from '../game/progression'
import { firebaseEnabled } from './firebase/config'

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
  /** (선택) 공용 랭킹 — Firebase 백엔드에서만 구현. 없으면 화면은 로컬 모의 데이터 사용 */
  submitScore?(name: string, score: number): Promise<void>
  loadLeaderboard?(): Promise<RankEntry[]>
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

// Firebase 백엔드는 활성화됐을 때만 동적 import 한다 (미사용 시 SDK 가 번들에서 빠짐).
let backendPromise: Promise<Store> | null = null
function backend(): Promise<Store> {
  if (!firebaseEnabled) return Promise.resolve(localStore)
  if (!backendPromise) {
    backendPromise = import('./firebase/firebaseStore').then((m) => m.firebaseStore)
  }
  return backendPromise
}

// 화면 코드는 항상 이 `store` 만 사용한다.
// VITE_FIREBASE_* 환경변수가 있으면 Firestore, 없으면 localStorage 로 위임된다.
export const store: Store = {
  async loadProfile() {
    return (await backend()).loadProfile()
  },
  async saveProfile(p) {
    return (await backend()).saveProfile(p)
  },
  async loadWrongNotes() {
    return (await backend()).loadWrongNotes()
  },
  async upsertWrongNote(note) {
    return (await backend()).upsertWrongNote(note)
  },
  async markResolved(problemId) {
    return (await backend()).markResolved(problemId)
  },
  // 랭킹은 Firebase 백엔드에서만 노출 (없으면 화면이 로컬 모의 데이터로 폴백)
  submitScore: firebaseEnabled
    ? async (name, score) => (await backend()).submitScore?.(name, score)
    : undefined,
  loadLeaderboard: firebaseEnabled
    ? async () => (await backend()).loadLeaderboard?.() ?? []
    : undefined,
}
