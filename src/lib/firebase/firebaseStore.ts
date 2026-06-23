import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore'
import { firebaseConfig } from './config'
import { emptyProfile, normalizeProfile, type PlayerProfile } from '../../game/gamification'
import type { RankEntry } from '../../game/progression'
import type { Store, WrongNote } from '../storage'

// Store 인터페이스의 Firestore 구현. localStore 와 1:1 로 호환되므로
// storage.ts 에서 동적 로드만 바꾸면 화면 코드는 그대로 클라우드 동기화로 전환된다.
// 이 모듈은 firebaseEnabled 일 때만 동적 import 되므로, Firebase SDK 는 여기에 격리된다.
//
// Firestore 구조:
//   users/{uid}                        → 프로필 1문서
//   users/{uid}/wrongNotes/{problemId} → 오답노트
//   leaderboard/{uid}                  → 공용 랭킹(이름·점수)

const app = initializeApp(firebaseConfig as Required<typeof firebaseConfig>)
const auth: Auth = getAuth(app)
const db: Firestore = getFirestore(app)

/** 익명 로그인 후 uid 반환 (학생 계정 없이도 동기화 시작) */
function uid(): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub()
        resolve(user.uid)
      }
    })
    signInAnonymously(auth).catch(reject)
  })
}

export const firebaseStore: Store = {
  async loadProfile() {
    const id = await uid()
    const snap = await getDoc(doc(db, 'users', id))
    return snap.exists() ? normalizeProfile(snap.data() as PlayerProfile) : emptyProfile
  },

  async saveProfile(p) {
    const id = await uid()
    await setDoc(doc(db, 'users', id), p, { merge: true })
  },

  async loadWrongNotes() {
    const id = await uid()
    const snap = await getDocs(collection(db, 'users', id, 'wrongNotes'))
    return snap.docs.map((d) => d.data() as WrongNote)
  },

  async upsertWrongNote(note) {
    const id = await uid()
    await setDoc(doc(db, 'users', id, 'wrongNotes', note.problem.id), note)
  },

  async markResolved(problemId) {
    const id = await uid()
    const ref = doc(db, 'users', id, 'wrongNotes', problemId)
    const snap = await getDoc(ref)
    if (snap.exists()) await setDoc(ref, { resolved: true }, { merge: true })
  },

  async submitScore(name, score) {
    const id = await uid()
    await setDoc(doc(db, 'leaderboard', id), {
      name,
      score,
      updatedAt: serverTimestamp(),
    })
  },

  async loadLeaderboard() {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(20))
    const snap = await getDocs(q)
    const me = await uid()
    return snap.docs.map((d) => {
      const data = d.data() as { name: string; score: number }
      return { name: data.name, score: data.score, me: d.id === me } as RankEntry
    })
  },
}
