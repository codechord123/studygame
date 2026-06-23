// Vercel 서버리스 함수 래퍼. (server/convert-handler.mjs 와 동일 로직을 재사용)
// 배포: 이 파일을 그대로 Vercel 프로젝트에 두면 /api/convert 엔드포인트가 된다.
// ANTHROPIC_API_KEY 는 Vercel 환경변수로 설정한다.
//
// @ts-expect-error — .mjs 핸들러는 런타임에서 import 된다 (빌드시 타입 없음)
import { convert } from '../server/convert-handler.mjs'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  try {
    const result = await convert(req.body)
    res.status(200).json(result)
  } catch (err: any) {
    res.status(400).json({ error: err?.message || '변환 실패' })
  }
}
