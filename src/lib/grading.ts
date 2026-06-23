import type { Problem } from '../types/problem'

// ── 유리수(분수) 파서 ──────────────────────────────────────────────
// "17/20", "1과3/10", "1 3/10", "13/10", "4", "2 5/8" 등을 분수 값으로 변환.
// 대분수와 가분수를 같은 값으로 비교할 수 있게 해준다. (13/10 === 1과3/10)

interface Rational {
  num: number
  den: number
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a || 1
}

function reduce({ num, den }: Rational): Rational {
  if (den === 0) return { num, den: 0 }
  const sign = den < 0 ? -1 : 1
  const g = gcd(num, den)
  return { num: (sign * num) / g, den: (sign * den) / g }
}

export function parseRational(raw: string): Rational | null {
  if (!raw) return null
  // "과"/"와" 등 대분수 구분자를 공백으로, 전각 슬래시는 / 로 통일
  const s = raw
    .trim()
    .replace(/[과와]/g, ' ')
    .replace(/／/g, '/')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 대분수: "A B/C"
  let m = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (m) {
    const whole = parseInt(m[1], 10)
    const n = parseInt(m[2], 10)
    const d = parseInt(m[3], 10)
    if (d === 0) return null
    const sign = whole < 0 ? -1 : 1
    return reduce({ num: sign * (Math.abs(whole) * d + n), den: d })
  }
  // 가분수/진분수: "A/B"
  m = s.match(/^(-?\d+)\s*\/\s*(\d+)$/)
  if (m) {
    const d = parseInt(m[2], 10)
    if (d === 0) return null
    return reduce({ num: parseInt(m[1], 10), den: d })
  }
  // 정수 또는 소수
  m = s.match(/^-?\d+(\.\d+)?$/)
  if (m) {
    const f = parseFloat(s)
    if (Number.isInteger(f)) return { num: f, den: 1 }
    // 소수는 분수로 환산
    const decimals = (s.split('.')[1] || '').length
    const den = Math.pow(10, decimals)
    return reduce({ num: Math.round(f * den), den })
  }
  return null
}

function rationalEqual(a: Rational, b: Rational): boolean {
  return a.num * b.den === b.num * a.den
}

/** 유리수를 가장 간단한 표기(기약분수/대분수)로 변환. 예: 34/40 → "17/20", 13/10 → "1과 3/10" */
export function toSimplestString(r: Rational): string {
  const { num, den } = reduce(r)
  if (den === 1) return `${num}`
  const sign = num < 0 ? '-' : ''
  const n = Math.abs(num)
  if (n < den) return `${sign}${n}/${den}`
  const whole = Math.floor(n / den)
  const rem = n % den
  return rem === 0 ? `${sign}${whole}` : `${sign}${whole}과 ${rem}/${den}`
}

/** 학생이 쓴 분수가 기약분수인지. 분수가 없으면 null (해당 없음) */
export function isReducedInput(raw: string): boolean | null {
  const s = raw.replace(/[과와]/g, ' ').replace(/／/g, '/')
  const m = s.match(/(\d+)\s*\/\s*(\d+)/) // 분수 부분
  if (!m) return null
  const n = parseInt(m[1], 10)
  const d = parseInt(m[2], 10)
  if (d === 0) return null
  return gcd(n, d) === 1
}

// ── 텍스트 정규화 (비수치 정답 비교용) ──────────────────────────────
function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

/** 사용자가 입력한 답이 허용 정답 목록 중 하나와 맞는지 */
export function matchAnswer(
  userInput: string,
  accepted: string[],
  numeric: boolean | undefined,
): boolean {
  const input = userInput.trim()
  if (input === '') return false

  if (numeric) {
    const u = parseRational(input)
    if (u) {
      return accepted.some((a) => {
        const r = parseRational(a)
        return r ? rationalEqual(u, r) : false
      })
    }
    // 숫자 파싱 실패 시 텍스트 비교로 폴백
  }
  const n = normalizeText(input)
  return accepted.some((a) => normalizeText(a) === n)
}

export interface GradeResult {
  correct: boolean
  /** 빈칸 유형: 칸별 정오표 */
  perBlank?: boolean[]
  /** 정답이지만 더 간단히 쓸 수 있을 때의 안내 (예: 기약분수) */
  note?: string
}

/** 피드백에 보여줄 정답 텍스트 (모든 유형 지원) */
export function correctAnswerText(problem: Problem): string {
  switch (problem.type) {
    case 'multiple_choice':
      return `${problem.answer + 1}번. ${problem.choices[problem.answer]}`
    case 'short_answer':
      return problem.answers[0] ?? ''
    case 'ox':
      return problem.answer ? 'O (맞음)' : 'X (틀림)'
    case 'fill_blank':
      return problem.blanks.map((b) => b[0]).join(' , ')
  }
}

/** 한 문제를 채점. responses는 빈칸 유형이면 칸 수만큼, 그 외는 길이 1. */
export function gradeProblem(problem: Problem, responses: string[]): GradeResult {
  switch (problem.type) {
    case 'multiple_choice': {
      const picked = parseInt(responses[0] ?? '', 10)
      return { correct: picked === problem.answer }
    }
    case 'ox': {
      const v = (responses[0] ?? '').trim().toUpperCase()
      const truthy = v === 'O' || v === 'TRUE' || v === '참' || v === '1'
      const falsy = v === 'X' || v === 'FALSE' || v === '거짓' || v === '0'
      if (!truthy && !falsy) return { correct: false }
      return { correct: (truthy && problem.answer) || (falsy && !problem.answer) }
    }
    case 'short_answer': {
      const correct = matchAnswer(responses[0] ?? '', problem.answers, problem.numericAnswer)
      let note: string | undefined
      // 분수 문제에서 정답이지만 약분이 안 됐으면 기약분수를 안내
      if (correct && problem.numericAnswer && isReducedInput(responses[0] ?? '') === false) {
        const r = parseRational(responses[0] ?? '')
        if (r) note = `정답이에요! 더 간단히 하면 ${toSimplestString(r)} 예요.`
      }
      return { correct, note }
    }
    case 'fill_blank': {
      const perBlank = problem.blanks.map((accepted, i) =>
        matchAnswer(responses[i] ?? '', accepted, problem.numericAnswer),
      )
      return { correct: perBlank.every(Boolean), perBlank }
    }
  }
}
