import Anthropic from '@anthropic-ai/sdk'

// 워크시트 이미지를 문제 JSON 으로 변환하는 핵심 로직.
// Node 데브 서버(server/index.mjs)와 서버리스 함수(api/convert.ts) 양쪽에서 재사용한다.
// API 키는 ANTHROPIC_API_KEY 환경변수에서만 읽는다 — 절대 브라우저로 내려보내지 않는다.

const MODEL = 'claude-opus-4-8'

/** data URL("data:image/png;base64,XXXX") 을 media_type 과 base64 로 분리 */
function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || '')
  if (!m) throw new Error('이미지는 base64 data URL 형식이어야 합니다.')
  return { mediaType: m[1], data: m[2] }
}

/** 모델 응답 텍스트에서 JSON 배열을 안전하게 추출 */
function extractJson(text) {
  let t = (text || '').trim()
  // ```json ... ``` 코드펜스 제거
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t)
  if (fence) t = fence[1].trim()
  // 첫 '[' 부터 마지막 ']' 까지
  const start = t.indexOf('[')
  const end = t.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

/** 최소 검증 + 기본값 보정 (프런트의 validateProblems 와 동일한 규칙) */
function validateProblems(items) {
  if (!Array.isArray(items)) throw new Error('문제 배열이 아닙니다.')
  return items.map((p, i) => {
    if (!p || typeof p !== 'object') throw new Error(`#${i} 잘못된 문항`)
    if (!p.id) p.id = `gen-${Date.now()}-${i}`
    if (!p.points) p.points = p.difficulty === 3 ? 20 : p.difficulty === 2 ? 15 : 10
    return p
  })
}

/**
 * 변환 본체.
 * @param {{image:string, systemPrompt?:string, hints?:object}} body
 * @returns {Promise<{problems:any[]}>}
 */
export async function convert(body) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 가 설정되지 않았습니다.')
  if (!body || !body.image) throw new Error('image 가 필요합니다.')

  const { mediaType, data } = parseDataUrl(body.image)
  const hints = body.hints || {}
  const hintLine = [
    hints.subject && `과목: ${hints.subject}`,
    hints.grade && `학년: ${hints.grade}`,
    hints.unit && `단원: ${hints.unit}`,
  ]
    .filter(Boolean)
    .join(' / ')

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: body.systemPrompt || '이미지의 모든 문항을 Problem[] JSON 배열로만 출력하세요.',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          {
            type: 'text',
            text:
              (hintLine ? `참고 정보 — ${hintLine}\n\n` : '') +
              '이 학습지 이미지의 모든 문제를 지시한 JSON 배열로 변환해 주세요. JSON 외 텍스트는 출력하지 마세요.',
          },
        ],
      },
    ],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')

  const problems = validateProblems(extractJson(text))
  return { problems }
}
