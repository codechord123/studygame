import type { Problem } from '../types/problem'
import {
  type CustomStore,
  type CustomItem,
  addCustomProblem,
} from '../data/customContent'

// 수업 꾸러미 — 교사가 만든 문제를 코드 하나로 묶어 학생에게 배포한다(백엔드 없이).
// 학생은 이 코드를 가져와 자기 문제 목록에 합친다. (실시간 진척 동기화는 클라우드 필요)

const PREFIX = 'BYEOLSUPPACK1-'

interface Pack {
  app: 'byeolsup-pack'
  v: 1
  title: string
  at: number
  items: CustomItem[]
}

function toB64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}
function fromB64(s: string): string {
  return decodeURIComponent(escape(atob(s)))
}

/** 문제 묶음을 공유 코드로 만든다. at은 호출부에서 주입. */
export function makeContentPack(title: string, items: CustomItem[], at: number): string {
  const pack: Pack = { app: 'byeolsup-pack', v: 1, title: title.trim() || '수업 꾸러미', at, items }
  return PREFIX + toB64(JSON.stringify(pack))
}

export interface PackInfo {
  ok: boolean
  error?: string
  title?: string
  count?: number
  at?: number
}

/** 코드를 검증/미리보기만 (쓰지 않음). */
export function inspectPack(code: string): PackInfo {
  try {
    const body = code.trim().replace(PREFIX, '')
    const pack = JSON.parse(fromB64(body)) as Pack
    if (pack.app !== 'byeolsup-pack' || !Array.isArray(pack.items)) {
      return { ok: false, error: '수업 꾸러미 코드가 아니에요.' }
    }
    return { ok: true, title: pack.title, count: pack.items.length, at: pack.at }
  } catch {
    return { ok: false, error: '코드를 읽을 수 없어요.' }
  }
}

export interface ImportResult extends PackInfo {
  store?: CustomStore
  added?: number
  skipped?: number
}

/** 코드의 문제를 customStore에 합친다. 같은 id는 건너뛴다(중복 방지). */
export function importPack(code: string, store: CustomStore): ImportResult {
  const info = inspectPack(code)
  if (!info.ok) return info
  const body = code.trim().replace(PREFIX, '')
  const pack = JSON.parse(fromB64(body)) as Pack
  let next = store
  let added = 0
  let skipped = 0
  for (const it of pack.items) {
    const existing = next[it.villagerId]?.[it.unitName] ?? []
    if (existing.some((p: Problem) => p.id === it.problem.id)) {
      skipped++
      continue
    }
    next = addCustomProblem(next, it.villagerId, it.unitName, it.problem)
    added++
  }
  return { ...info, store: next, added, skipped }
}
