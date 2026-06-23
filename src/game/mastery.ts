import type { Problem } from '../types/problem'

// 문항별 숙련도 추적 + 출제 우선순위 (가벼운 간격 반복/Leitner 방식).
// 기존 "틀린 문제 먼저"보다 정교하게: 안 풀어본 문제 → 최근 틀린 문제 →
// 아직 덜 익숙한 문제 → 잘 맞히는 문제 순으로 내보낸다.

export interface MasteryEntry {
  seen: number // 풀어본 횟수
  streak: number // 연속 정답 수 (틀리면 0)
  wrong: boolean // 마지막에 틀렸는지
}
export type MasteryMap = Record<string, MasteryEntry>

export function emptyEntry(): MasteryEntry {
  return { seen: 0, streak: 0, wrong: false }
}

/** 한 문항을 풀고 난 뒤 숙련도 갱신값 계산 (순수 함수) */
export function updateEntry(prev: MasteryEntry | undefined, correct: boolean): MasteryEntry {
  const e = prev ?? emptyEntry()
  return {
    seen: e.seen + 1,
    streak: correct ? e.streak + 1 : 0,
    wrong: !correct,
  }
}

/**
 * 출제 우선순위 점수 (낮을수록 먼저). 학습 모드에서 사용.
 *  0      : 한 번도 안 풀어본 문제
 *  1      : 최근에 틀린 문제 (즉시 복습)
 *  2..    : streak 가 쌓일수록 뒤로 (이미 익숙)
 */
export function priority(p: Problem, mastery: MasteryMap): number {
  const m = mastery[p.id]
  if (!m || m.seen === 0) return 0
  if (m.wrong) return 1
  return 2 + Math.min(m.streak, 6)
}

/** 학습 모드 출제 순서: 우선순위 오름차순, 동순위는 약간 섞어 단조로움 방지 */
export function orderByMastery(problems: Problem[], mastery: MasteryMap): Problem[] {
  return problems
    .map((p) => ({ p, k: priority(p, mastery), r: Math.random() }))
    .sort((a, b) => a.k - b.k || a.r - b.r)
    .map((x) => x.p)
}

/** 한 문항의 숙련 정도(0~1). 진척도 표시용 */
export function masteryLevel(p: Problem, mastery: MasteryMap): number {
  const m = mastery[p.id]
  if (!m || m.seen === 0) return 0
  return Math.min(1, m.streak / 3)
}
