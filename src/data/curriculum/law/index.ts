import type { Problem } from '../../../types/problem'
import { speedProblems } from './speed'
import { battleProblems } from './battle'
import { oxProblems } from './ox'
import { memoryProblems } from './memory'
import { fillProblems } from './fill'
import { sortProblems } from './sort'
import { sequenceProblems } from './sequence'
import { appliedProblems } from './applied'

// 「법과 인권」(사회 5-1) 미니게임별 맞춤 문제 풀.
//  - speed    : 짧고 빠른 객관식
//  - battle   : 사고력이 필요한 어려운 객관식·빈칸
//  - ox       : O/X 판단 문장
//  - memory   : 용어↔뜻 짝짓기(짧은 답)
//  - fill     : 빈칸 채우기·핵심 낱말
//  - sort     : 기본권 3바구니 분류(자유권·평등권·사회권)
//  - sequence : 과정/절차 순서 맞추기(입법·재판·인권구제 등)
// 각 문제의 tags 에 미니게임 id 가 들어 있어, 게임마다 성향에 맞는 문제만 뽑힌다.
export const lawProblems: Problem[] = [
  ...speedProblems,
  ...battleProblems,
  ...oxProblems,
  ...memoryProblems,
  ...fillProblems,
  ...sortProblems,
  ...sequenceProblems,
  ...appliedProblems,
]
