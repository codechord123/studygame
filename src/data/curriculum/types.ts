import type { Problem } from '../../types/problem'

// 과목 → 단원 → 문제 구조.
// 새 문제는 각 과목 파일(math.ts·korean.ts·social.ts·science.ts)의 units 배열에
// Unit 을 추가하는 방식으로 넣으면 됩니다.

export interface Unit {
  id: string // 고유 id (예: 'math-5-1-frac')
  subject: string // 과목명 (수학/국어/사회/과학) — 광장 NPC 과 매칭
  grade?: string // 학년 (예: '5-1')
  unit: string // 단원 이름 (예: '분수의 덧셈과 뺄셈')
  problems: Problem[] // 이 단원의 문제들
}
