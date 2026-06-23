import type { Problem } from '../../types/problem'

// 워크시트 이미지 → 디지털 문제(JSON) 자동 변환 모듈.
//
// 동작 방식(설계):
//   1. 사용자가 문제집/시험지 사진을 업로드한다.
//   2. 비전 지원 LLM(Claude) 에게 이미지 + 아래 스키마 지시를 보낸다.
//   3. LLM 이 src/types/problem.ts 의 Problem[] 형식 JSON 을 반환한다.
//   4. 검증 후 퀴즈로 저장한다.
//
// 보안: API 키를 브라우저에 두면 안 된다. 실제 호출은 서버리스 함수
//   (예: Firebase Functions / Vercel Function) 를 거치고, 이 모듈은 그 엔드포인트를 부른다.

export const CONVERSION_SYSTEM_PROMPT = `당신은 초·중등 학습지 이미지를 디지털 문제 데이터로 변환하는 도구입니다.
이미지 속 모든 문항을 읽어 아래 TypeScript 타입의 JSON 배열로만 응답하세요. 설명 문장 없이 JSON 만 출력합니다.

type Problem =
  | { id, subject, grade, unit, number?, prompt, type:"multiple_choice", difficulty:1|2|3, points, choices:string[], answer:number, explanation?, numericAnswer? }
  | { id, subject, grade, unit, number?, prompt, type:"short_answer", difficulty:1|2|3, points, answers:string[], explanation?, numericAnswer? }
  | { id, subject, grade, unit, number?, prompt, type:"ox", difficulty:1|2|3, points, answer:boolean, explanation? }
  | { id, subject, grade, unit, number?, prompt, type:"fill_blank", difficulty:1|2|3, points, blanks:string[][], explanation?, numericAnswer? }

규칙:
- 분수는 "분자/분모", 대분수는 "정수와 분자/분모"(예: "1과 3/10") 로 표기.
- 수학 계산 답이면 numericAnswer:true 로 설정.
- multiple_choice 의 answer 는 정답 보기의 0-base 인덱스.
- fill_blank 는 prompt 안에 {{0}}, {{1}} 자리표시자를 쓰고 blanks 와 순서를 맞춘다.
- difficulty 와 points(난이도 1→10, 2→15, 3→20)는 문항 난이도에 맞게 추정.
- 가능하면 explanation(풀이) 도 채운다.`

export interface ConvertOptions {
  /** 변환 요청을 처리하는 서버리스 엔드포인트. 없으면 호출 시 에러. */
  endpoint?: string
  subjectHint?: string
  gradeHint?: string
  unitHint?: string
}

/**
 * 이미지(base64 data URL)를 문제 배열로 변환.
 * 실제 LLM 호출은 서버 엔드포인트에 위임한다. (키 노출 방지)
 */
/** 변환 엔드포인트 기본값: VITE_CONVERT_ENDPOINT 환경변수 → 없으면 로컬 데브 서버 */
export const DEFAULT_ENDPOINT =
  (import.meta.env?.VITE_CONVERT_ENDPOINT as string | undefined) ??
  'http://localhost:8787/api/convert'

export async function convertImageToProblems(
  imageDataUrl: string,
  opts: ConvertOptions = {},
): Promise<Problem[]> {
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageDataUrl,
      systemPrompt: CONVERSION_SYSTEM_PROMPT,
      hints: {
        subject: opts.subjectHint,
        grade: opts.gradeHint,
        unit: opts.unitHint,
      },
    }),
  })
  if (!res.ok) throw new Error(`변환 실패: ${res.status}`)
  const data = (await res.json()) as { problems: Problem[] }
  return validateProblems(data.problems)
}

/** LLM 출력이 스키마에 맞는지 최소 검증 + id 보정 */
export function validateProblems(items: unknown): Problem[] {
  if (!Array.isArray(items)) throw new Error('문제 배열이 아닙니다.')
  return items.map((raw, i) => {
    const p = raw as Problem
    if (!p || typeof p !== 'object') throw new Error(`#${i} 잘못된 문항`)
    if (!p.id) p.id = `gen-${Date.now()}-${i}`
    if (!('points' in p) || !p.points) {
      p.points = p.difficulty === 3 ? 20 : p.difficulty === 2 ? 15 : 10
    }
    return p
  })
}
