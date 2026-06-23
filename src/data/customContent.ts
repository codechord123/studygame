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
