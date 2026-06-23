import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem } from '../types/problem'
import { gradeProblem } from '../lib/grading'

interface Props {
  problem: Problem
  index: number
  total: number
  combo: number
  /** 제한 시간(초). 0이면 타이머 없음 */
  timeLimit?: number
  onSubmit: (result: {
    correct: boolean
    responses: string[]
    timeLeftRatio: number
  }) => void
}

export function QuestionCard({ problem, index, total, combo, timeLimit = 30, onSubmit }: Props) {
  const blankCount = problem.type === 'fill_blank' ? problem.blanks.length : 1
  const [responses, setResponses] = useState<string[]>(() => Array(blankCount).fill(''))
  const [picked, setPicked] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof gradeProblem> | null>(null)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const startRef = useRef(Date.now())

  // 문제가 바뀌면 상태 초기화
  useEffect(() => {
    setResponses(Array(blankCount).fill(''))
    setPicked(null)
    setSubmitted(false)
    setResult(null)
    setTimeLeft(timeLimit)
    startRef.current = Date.now()
  }, [problem.id, blankCount, timeLimit])

  // 타이머
  useEffect(() => {
    if (!timeLimit || submitted) return
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, submitted, timeLimit])

  const promptParts = useMemo(() => {
    if (problem.type !== 'fill_blank') return null
    return problem.prompt.split(/(\{\{\d+\}\})/g)
  }, [problem])

  function buildResponses(): string[] {
    if (problem.type === 'multiple_choice') return [String(picked ?? -1)]
    return responses
  }

  function handleSubmit() {
    if (submitted) return
    const resp = buildResponses()
    const r = gradeProblem(problem, resp)
    setResult(r)
    setSubmitted(true)
    const timeLeftRatio = timeLimit ? Math.max(0, timeLeft) / timeLimit : 0
    // 잠깐 피드백을 보여준 뒤 다음으로
    window.setTimeout(() => {
      onSubmit({ correct: r.correct, responses: resp, timeLeftRatio })
    }, 1100)
  }

  const canSubmit =
    !submitted &&
    (problem.type === 'multiple_choice'
      ? picked !== null
      : responses.some((r) => r.trim() !== ''))

  return (
    <div className="card question-card">
      <div className="q-meta">
        <span className="q-progress">
          {index + 1} / {total}
        </span>
        {combo >= 2 && <span className="combo-chip">🔥 {combo} COMBO</span>}
        {timeLimit > 0 && (
          <span className={`timer ${timeLeft <= 5 ? 'danger' : ''}`}>⏱ {timeLeft}s</span>
        )}
      </div>
      {timeLimit > 0 && (
        <div className="timer-bar">
          <div
            className="timer-bar-fill"
            style={{ width: `${(Math.max(0, timeLeft) / timeLimit) * 100}%` }}
          />
        </div>
      )}

      {problem.type === 'fill_blank' && promptParts ? (
        <p className="prompt">
          {promptParts.map((part, i) => {
            const m = part.match(/\{\{(\d+)\}\}/)
            if (m) {
              const bi = parseInt(m[1], 10)
              return (
                <input
                  key={i}
                  className={`blank-input ${
                    submitted ? (result?.perBlank?.[bi] ? 'ok' : 'no') : ''
                  }`}
                  value={responses[bi] ?? ''}
                  disabled={submitted}
                  onChange={(e) =>
                    setResponses((r) => {
                      const c = [...r]
                      c[bi] = e.target.value
                      return c
                    })
                  }
                />
              )
            }
            return <span key={i}>{part}</span>
          })}
        </p>
      ) : (
        <p className="prompt">{problem.prompt}</p>
      )}

      {problem.type === 'multiple_choice' && (
        <div className="choices">
          {problem.choices.map((c, i) => {
            const isAnswer = i === problem.answer
            const isPicked = i === picked
            let cls = 'choice'
            if (submitted) {
              if (isAnswer) cls += ' correct'
              else if (isPicked) cls += ' wrong'
            } else if (isPicked) cls += ' picked'
            return (
              <button
                key={i}
                className={cls}
                disabled={submitted}
                onClick={() => setPicked(i)}
              >
                <span className="choice-num">{i + 1}</span> {c}
              </button>
            )
          })}
        </div>
      )}

      {problem.type === 'ox' && (
        <div className="choices ox">
          {[
            { label: 'O', val: 'O' },
            { label: 'X', val: 'X' },
          ].map((o) => (
            <button
              key={o.val}
              className={`choice ox-btn ${responses[0] === o.val ? 'picked' : ''}`}
              disabled={submitted}
              onClick={() => setResponses([o.val])}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {problem.type === 'short_answer' && (
        <input
          className={`answer-input ${submitted ? (result?.correct ? 'ok' : 'no') : ''}`}
          placeholder="정답 입력 (예: 17/20, 1과 3/10)"
          value={responses[0] ?? ''}
          disabled={submitted}
          onChange={(e) => setResponses([e.target.value])}
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
        />
      )}

      {submitted && result && (
        <div className={`feedback ${result.correct ? 'good' : 'bad'}`}>
          {result.correct ? '정답! 🎉' : '아쉬워요 😢'}
          {!result.correct && problem.explanation && (
            <div className="explain">💡 {problem.explanation}</div>
          )}
        </div>
      )}

      {!submitted && (
        <button className="btn primary submit" disabled={!canSubmit} onClick={handleSubmit}>
          제출
        </button>
      )}
    </div>
  )
}
