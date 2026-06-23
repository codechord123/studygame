import type { Problem } from '../types/problem'
import { allProblems } from './curriculum'

// 과목(주민)별 전체 문제 (단원 평탄화). 단원 구분 없이 시작하는 경로
// (AI 추가 문제·채집 미션 등)에서 사용. 단원별 학습은 curriculum 을 직접 쓴다.
export const VILLAGER_PROBLEMS: Record<string, Problem[]> = {
  math: allProblems('math'),
  korean: allProblems('korean'),
  social: allProblems('social'),
  science: allProblems('science'),
}
