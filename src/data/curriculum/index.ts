import type { Problem } from '../../types/problem'
import type { Unit } from './types'
import { mathUnits } from './math'
import { koreanUnits } from './korean'
import { socialUnits } from './social'
import { scienceUnits } from './science'

export type { Unit }

// 광장 NPC(villager id) → 그 과목의 단원 목록
export const CURRICULUM: Record<string, Unit[]> = {
  math: mathUnits,
  korean: koreanUnits,
  social: socialUnits,
  science: scienceUnits,
}

export function unitsFor(villagerId: string): Unit[] {
  return CURRICULUM[villagerId] ?? []
}

export function unitById(unitId: string): Unit | undefined {
  for (const units of Object.values(CURRICULUM)) {
    const u = units.find((x) => x.id === unitId)
    if (u) return u
  }
  return undefined
}

/** 과목의 모든 문제를 평탄화 (AI 추가·채집 등 단원 구분 없는 경로용) */
export function allProblems(villagerId: string): Problem[] {
  return unitsFor(villagerId).flatMap((u) => u.problems)
}
