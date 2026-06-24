// 문제 데이터 스키마 — 과목/유형에 상관없이 AI 자동변환 결과를 담을 수 있도록 설계.
// AI 변환기는 워크시트 이미지를 받아 아래 형식의 JSON 배열을 만들어낸다. (src/lib/ai/convert.ts 참고)

export type ProblemType = 'multiple_choice' | 'short_answer' | 'fill_blank' | 'ox' | 'sequence'

export interface ProblemBase {
  id: string
  subject: string // 예: "수학"
  grade: string // 예: "5-1"
  unit: string // 예: "5. 분수의 덧셈과 뺄셈"
  number?: number // 원본 문제 번호
  prompt: string // 문제 발문 (텍스트). 빈칸 유형은 {{0}}, {{1}} 자리표시자 사용
  type: ProblemType
  difficulty: 1 | 2 | 3 // 1 쉬움 ~ 3 어려움
  points: number // 기본 획득 점수(난이도 기반)
  explanation?: string // 해설 — 오답노트에서 보여줌
  tags?: string[]
  /** short_answer/fill_blank 채점 시 유리수(분수)로 비교할지 여부 */
  numericAnswer?: boolean
  /** 문제에 첨부된 그림/사진 (data URL). 직접 만들기에서 캡처 첨부 */
  image?: string
}

export interface MultipleChoiceProblem extends ProblemBase {
  type: 'multiple_choice'
  choices: string[]
  answer: number // 정답 보기의 인덱스(0-base)
}

export interface ShortAnswerProblem extends ProblemBase {
  type: 'short_answer'
  answers: string[] // 허용되는 정답 표기들
}

export interface OXProblem extends ProblemBase {
  type: 'ox'
  answer: boolean // true=O, false=X
}

export interface FillBlankProblem extends ProblemBase {
  type: 'fill_blank'
  blanks: string[][] // 각 빈칸별 허용 정답 목록. prompt의 {{i}} 와 대응
}

export interface SequenceProblem extends ProblemBase {
  type: 'sequence'
  steps: string[] // 올바른 순서대로의 단계들 (게임에서 섞어서 출제)
}

export type Problem =
  | MultipleChoiceProblem
  | ShortAnswerProblem
  | OXProblem
  | FillBlankProblem
  | SequenceProblem

export interface Quiz {
  id: string
  title: string
  subject: string
  grade: string
  unit: string
  problems: Problem[]
}
