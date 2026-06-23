import type { Problem } from '../types/problem'
import type { Unit } from './curriculum/types'
import { unitsFor } from './curriculum'

// 학생/교사가 직접 만든 문제. localStorage 에 저장되어 교육과정(curriculum)에 합쳐진다.
// 구조: villagerId → 단원이름 → 문제[]

export type CustomStore = Record<string, Record<string, Problem[]>>

const KEY = 'sg.custom.v1'

export function loadCustom(): CustomStore {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

function save(store: CustomStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* 용량 초과 등 무시 */
  }
}

/** 문제 추가 후 갱신된 store 반환 */
export function addCustomProblem(
  store: CustomStore,
  villagerId: string,
  unitName: string,
  problem: Problem,
): CustomStore {
  const next: CustomStore = { ...store, [villagerId]: { ...(store[villagerId] ?? {}) } }
  const list = next[villagerId][unitName] ?? []
  next[villagerId][unitName] = [...list, problem]
  save(next)
  return next
}

/** id로 문제 1개 삭제 후 갱신된 store 반환 (빈 단원/과목은 정리) */
export function deleteCustomProblem(
  store: CustomStore,
  villagerId: string,
  unitName: string,
  problemId: string,
): CustomStore {
  const units = store[villagerId]
  if (!units || !units[unitName]) return store
  const list = units[unitName].filter((p) => p.id !== problemId)
  const nextUnits: Record<string, Problem[]> = { ...units }
  if (list.length) nextUnits[unitName] = list
  else delete nextUnits[unitName]
  const next: CustomStore = { ...store }
  if (Object.keys(nextUnits).length) next[villagerId] = nextUnits
  else delete next[villagerId]
  save(next)
  return next
}

/** 같은 id 문제를 교체(수정) 후 갱신된 store 반환 */
export function updateCustomProblem(
  store: CustomStore,
  villagerId: string,
  unitName: string,
  problem: Problem,
): CustomStore {
  const units = store[villagerId] ?? {}
  const list = units[unitName] ?? []
  const idx = list.findIndex((p) => p.id === problem.id)
  if (idx < 0) return addCustomProblem(store, villagerId, unitName, problem)
  const nextList = list.map((p) => (p.id === problem.id ? problem : p))
  const next: CustomStore = {
    ...store,
    [villagerId]: { ...units, [unitName]: nextList },
  }
  save(next)
  return next
}

/** 내가 만든 문제만 평탄화 — 관리 화면용 */
export interface CustomItem {
  villagerId: string
  unitName: string
  problem: Problem
}
export function flattenCustom(store: CustomStore): CustomItem[] {
  const out: CustomItem[] = []
  for (const [villagerId, units] of Object.entries(store)) {
    for (const [unitName, problems] of Object.entries(units)) {
      for (const problem of problems) out.push({ villagerId, unitName, problem })
    }
  }
  return out
}

/** 정적 단원 + 커스텀 단원을 단원이름 기준으로 합침 */
export function mergedUnitsFor(villagerId: string, subject: string, store: CustomStore): Unit[] {
  const byName = new Map<string, Unit>()
  for (const u of unitsFor(villagerId)) byName.set(u.unit, { ...u, problems: [...u.problems] })
  const custom = store[villagerId] ?? {}
  for (const [unitName, problems] of Object.entries(custom)) {
    const existing = byName.get(unitName)
    if (existing) existing.problems.push(...problems)
    else byName.set(unitName, { id: 'custom-' + villagerId + '-' + unitName, subject, unit: unitName, problems })
  }
  return [...byName.values()]
}

/** 한 과목의 모든 단원 이름 (드롭다운용) */
export function unitNamesFor(villagerId: string, subject: string, store: CustomStore): string[] {
  return mergedUnitsFor(villagerId, subject, store).map((u) => u.unit)
}
