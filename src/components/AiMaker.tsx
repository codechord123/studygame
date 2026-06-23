import { useState } from 'react'
import {
  convertImageToProblems,
  CONVERSION_SYSTEM_PROMPT,
  DEFAULT_ENDPOINT,
} from '../lib/ai/convert'
import type { Problem } from '../types/problem'

interface Props {
  onBack: () => void
  onUse: (problems: Problem[], title: string) => void
}

// 학습지 사진을 업로드 → AI 가 문제 JSON 으로 변환 → 미리보기 → 그대로 학습 시작.
export function AiMaker({ onBack, onUse }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [subject, setSubject] = useState('수학')
  const [grade, setGrade] = useState('5-1')
  const [unit, setUnit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [problems, setProblems] = useState<Problem[] | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    setProblems(null)
    const reader = new FileReader()
    reader.onload = () => setImageUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function convert() {
    if (!imageUrl) return
    setLoading(true)
    setError(null)
    try {
      const result = await convertImageToProblems(imageUrl, {
        subjectHint: subject,
        gradeHint: grade,
        unitHint: unit,
      })
      if (result.length === 0) throw new Error('문제를 찾지 못했습니다. 더 선명한 사진으로 시도해 보세요.')
      setProblems(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '변환 실패'
      // fetch 실패(서버 미실행)면 안내 추가
      setError(
        /fetch|Failed|NetworkError|load/i.test(msg)
          ? `변환 서버에 연결할 수 없습니다 (${DEFAULT_ENDPOINT}). "npm run server" 로 서버를 켜세요.`
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="screen ai-maker">
      <h1 className="title">🤖 AI 문제 만들기</h1>
      <p className="subtitle">문제집·시험지 사진을 올리면 자동으로 문제로 바꿔줘요</p>

      <label className="upload-box">
        {imageUrl ? (
          <img src={imageUrl} alt="업로드한 학습지" className="upload-preview" />
        ) : (
          <span className="upload-hint">📷 사진 선택 / 촬영</span>
        )}
        <input type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
      </label>
      {fileName && <p className="filename">{fileName}</p>}

      <div className="hint-row">
        <input className="hint-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="과목" />
        <input className="hint-input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="학년" />
        <input className="hint-input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="단원(선택)" />
      </div>

      {error && <div className="feedback bad">{error}</div>}

      {!problems && (
        <button className="btn primary big" disabled={!imageUrl || loading} onClick={convert}>
          {loading ? '변환 중… 🪄' : '문제로 변환하기'}
        </button>
      )}

      {problems && (
        <section className="preview">
          <h3>변환된 문제 {problems.length}개</h3>
          <ul className="preview-list">
            {problems.map((p, i) => (
              <li key={p.id} className="preview-item">
                <span className="preview-num">{i + 1}</span>
                <div>
                  <p className="preview-prompt">{p.prompt}</p>
                  <span className="preview-type">{typeLabel(p.type)}</span>
                </div>
              </li>
            ))}
          </ul>
          <button
            className="btn primary big"
            onClick={() => onUse(problems, `${subject} ${unit || grade} (AI)`)}
          >
            ▶ 이 문제로 학습 시작
          </button>
          <button className="btn ghost big" onClick={() => setProblems(null)}>
            다시 변환
          </button>
        </section>
      )}

      <details className="prompt-peek">
        <summary>AI 에게 보내는 변환 규칙 보기</summary>
        <pre>{CONVERSION_SYSTEM_PROMPT}</pre>
      </details>

      <button className="btn ghost big" onClick={onBack}>
        홈으로
      </button>
    </main>
  )
}

function typeLabel(t: Problem['type']): string {
  return t === 'multiple_choice'
    ? '객관식'
    : t === 'short_answer'
      ? '주관식'
      : t === 'fill_blank'
        ? '빈칸'
        : 'OX'
}
