import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'

// 학습지 이미지 → 문제 JSON 변환 Cloud Function.
// API 키는 Secret Manager 에 저장한다:  firebase functions:secrets:set ANTHROPIC_API_KEY
// 배포:  firebase deploy --only functions

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
const MODEL = 'claude-opus-4-8'

const SYSTEM_PROMPT = `당신은 초·중등 학습지 이미지를 디지털 문제 데이터로 변환하는 도구입니다.
이미지 속 모든 문항을 읽어 Problem[] JSON 배열로만 응답하세요. 설명 문장 없이 JSON 만 출력합니다.
유형: multiple_choice(choices,answer 인덱스) / short_answer(answers[]) / ox(answer:boolean) / fill_blank(prompt에 {{0}} 자리표시자, blanks[][]).
분수는 "분자/분모", 대분수는 "정수와 분자/분모"(예 "1과 3/10"). 수학 계산 답이면 numericAnswer:true.
각 문항에 subject, grade, unit, difficulty(1~3), points(난이도 1→10,2→15,3→20), 가능하면 explanation 포함.`

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || '')
  if (!m) throw new Error('이미지는 base64 data URL 형식이어야 합니다.')
  return { mediaType: m[1], data: m[2] }
}

function extractJson(text) {
  let t = (text || '').trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('[')
  const end = t.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

function validateProblems(items) {
  if (!Array.isArray(items)) throw new Error('문제 배열이 아닙니다.')
  return items.map((p, i) => {
    if (!p || typeof p !== 'object') throw new Error(`#${i} 잘못된 문항`)
    if (!p.id) p.id = `gen-${Date.now()}-${i}`
    if (!p.points) p.points = p.difficulty === 3 ? 20 : p.difficulty === 2 ? 15 : 10
    return p
  })
}

export const convert = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, timeoutSeconds: 120, memory: '512MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST only' })
      return
    }
    try {
      const body = req.body || {}
      if (!body.image) throw new Error('image 가 필요합니다.')
      const { mediaType, data } = parseDataUrl(body.image)
      const hints = body.hints || {}
      const hintLine = [
        hints.subject && `과목: ${hints.subject}`,
        hints.grade && `학년: ${hints.grade}`,
        hints.unit && `단원: ${hints.unit}`,
      ]
        .filter(Boolean)
        .join(' / ')

      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: body.systemPrompt || SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
              {
                type: 'text',
                text:
                  (hintLine ? `참고 정보 — ${hintLine}\n\n` : '') +
                  '이 학습지 이미지의 모든 문제를 JSON 배열로 변환해 주세요. JSON 외 텍스트는 출력하지 마세요.',
              },
            ],
          },
        ],
      })

      const text = message.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
      res.status(200).json({ problems: validateProblems(extractJson(text)) })
    } catch (err) {
      res.status(400).json({ error: err?.message || '변환 실패' })
    }
  },
)
