import type { Unit } from './types'
import { sampleQuiz } from '../sampleQuiz'

// 수학 단원 모음. 새 단원은 아래 배열에 객체를 추가하세요.
export const mathUnits: Unit[] = [
  {
    id: 'math-5-1-frac',
    subject: '수학',
    grade: '5-1',
    unit: '분수의 덧셈과 뺄셈',
    problems: sampleQuiz.problems,
  },

  // 예시) 새 단원 추가 형식 — 주석을 풀고 문제를 채우세요.
  // {
  //   id: 'math-5-1-multiple',
  //   subject: '수학',
  //   grade: '5-1',
  //   unit: '약수와 배수',
  //   problems: [
  //     {
  //       id: 'mm-1', subject: '수학', grade: '5-1', unit: '약수와 배수',
  //       type: 'multiple_choice', difficulty: 1, points: 10,
  //       prompt: '12의 약수가 아닌 것은?',
  //       choices: ['1', '5', '6', '12'], answer: 1,
  //       explanation: '12의 약수: 1,2,3,4,6,12. 5는 아님.',
  //     },
  //   ],
  // },
]
