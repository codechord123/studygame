import http from 'node:http'
import { convert } from './convert-handler.mjs'

// AI 변환용 로컬 데브 서버. 프런트(Vite, 보통 5173)에서 fetch 로 호출한다.
//   실행:  ANTHROPIC_API_KEY=sk-ant-... npm run server
// 운영에서는 server/convert-handler.mjs 를 서버리스 함수(api/convert.ts)로 감싸 배포한다.

const PORT = process.env.PORT || 8787
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS })
  res.end(JSON.stringify(obj))
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    return res.end()
  }
  if (req.method === 'POST' && req.url === '/api/convert') {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 20 * 1024 * 1024) req.destroy() // 20MB 상한
    })
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}')
        const result = await convert(body)
        send(res, 200, result)
      } catch (err) {
        console.error('[convert] error:', err?.message)
        send(res, 400, { error: err?.message || '변환 실패' })
      }
    })
    return
  }
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true })
  send(res, 404, { error: 'not found' })
})

server.listen(PORT, () => {
  console.log(`AI 변환 서버 실행 중 → http://localhost:${PORT}/api/convert`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY 가 없습니다. 변환 요청은 실패합니다.')
  }
})
