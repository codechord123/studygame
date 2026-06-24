import { useEffect, useMemo, useRef, useState } from 'react'
import type { Problem } from '../types/problem'
import { gradeProblem, correctAnswerText } from '../lib/grading'
import { computeScore } from '../game/gamification'
import { playCorrect, playWrong } from '../lib/sfx'

export type PlayMode = 'study' | 'challenge'

interface Props {
  problem: Problem
  index: number
  total: number
  combo: number
  mode: PlayMode
  onSubmit: (result: { correct: boolean; responses: string[]; timeLeftRatio: number }) => void
  /** 풀이 도중 마을로 나가기 */
  onExit?: () => void
  /** 과목 테마 클래스 (시각 통일) */
  theme?: string
  /** 도전 모드에서 정답을 맞혀도 자동으로 넘어가지 않게(해설을 읽도록). 기본 true */
  autoAdvance?: boolean
}

/** 도전 모드 제한 시간: 난이도 + 문제 길이에 따라 가변 */
function challengeTime(problem: Problem): number {
  const base = 14 + problem.difficulty * 7 // 난이도 1→21, 2→28, 3→35초
  const long = problem.prompt.length > 50 ? 12 : 0 // 긴 문장제는 더 줌
  return base + long
}

export function QuestionCard({ problem, index, total, combo, mode, onSubmit, onExit, theme, autoAdvance = true }: Props) {
  const timeLimit = mode === 'challenge' ? challengeTime(problem) : 0
  const blankCount = problem.type === 'fill_blank' ? problem.blanks.length : 1
  const [responses, setResponses] = useState<string[]>(() => Array(blankCount).fill(''))
  const [picked, setPicked] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof gradeProblem> | null>(null)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  /** 정답 시 화면에 떠오르는 획득 점수(연출용) */
  const [gain, setGain] = useState<number | null>(null)
  const pendingRef = useRef<{ correct: boolean; responses: string[]; timeLeftRatio: number } | null>(
    null,
  )
  const advancedRef = useRef(false)

  // 문제가 바뀌면 상태 초기화
  useEffect(() => {
    setResponses(Array(blankCount).fill(''))
    setPicked(null)
    setSubmitted(false)
    setResult(null)
    setGain(null)
    setTimeLeft(timeLimit)
    pendingRef.current = null
    advancedRef.current = false
  }, [problem.id, blankCount, timeLimit])

  // 타이머 (도전 모드)
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

  function goNext() {
    if (advancedRef.current || !pendingRef.current) return
    advancedRef.current = true
    onSubmit(pendingRef.current)
  }

  function handleSubmit() {
    if (submitted) return
    const resp = buildResponses()
    const r = gradeProblem(problem, resp)
    setResult(r)
    setSubmitted(true)
    if (r.correct) playCorrect()
    else playWrong()
    const timeLeftRatio = timeLimit ? Math.max(0, timeLeft) / timeLimit : 0
    pendingRef.current = { correct: r.correct, responses: resp, timeLeftRatio }
    if (r.correct) {
      // 이 정답으로 콤보가 1 오른다 → 그 콤보 기준 점수를 미리보기로 띄움
      setGain(computeScore({ basePoints: problem.points, combo: combo + 1, timeLeftRatio }))
    }
    // 도전 모드에서 정답이면 잠깐 보여주고 자동 진행. 그 외(오답·학습 모드,
    // autoAdvance=false)는 "다음" 버튼을 눌러야 넘어간다 — 풀이를 충분히 읽도록.
    if (autoAdvance && mode === 'challenge' && r.correct) {
      window.setTimeout(goNext, 900)
    }
  }

  const canSubmit =
    !submitted &&
    (problem.type === 'multiple_choice'
      ? picked !== null
      : responses.some((r) => r.trim() !== ''))

  return (
    <div className={`card question-card ${theme ?? ''}`}>
      {gain != null && (
        <div className="score-burst" aria-hidden>
          <span className="score-burst-pts">+{gain}</span>
          {combo + 1 >= 2 && <span className="score-burst-combo">🔥 {combo + 1} COMBO</span>}
        </div>
      )}
      <div className="q-meta">
        {onExit && (
          <button className="q-exit" onClick={onExit} title="마을로 나가기">
            ← 나가기
          </button>
        )}
        <span className="q-progress">
          {index + 1} / {total}
        </span>
        {combo >= 2 && (
          <span key={combo} className="combo-chip">
            🔥 {combo} COMBO
          </span>
        )}
        {timeLimit > 0 && (
          <span className={`timer ${timeLeft <= 5 ? 'danger' : ''}`}>⏱ {timeLeft}s</span>
        )}
      </div>
      <div className="qbar" aria-hidden>
        <span className="qbar-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      {timeLimit > 0 && (
        <div className="timer-bar">
          <div
            className="timer-bar-fill"
            style={{ width: `${(Math.max(0, timeLeft) / timeLimit) * 100}%` }}
          />
        </div>
      )}

      {problem.image && <img className="q-image" src={problem.image} alt="문제 그림" />}

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
                  inputMode={problem.numericAnswer ? 'text' : undefined}
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
              <button key={i} className={cls} disabled={submitted} onClick={() => setPicked(i)}>
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
        <>
          <input
            className={`answer-input ${submitted ? (result?.correct ? 'ok' : 'no') : ''}`}
            placeholder={
              problem.numericAnswer ? '분수로 입력 (예: 17/20, 1과 3/10)' : '정답을 입력하세요'
            }
            value={responses[0] ?? ''}
            disabled={submitted}
            inputMode={problem.numericAnswer ? 'text' : undefined}
            autoComplete="off"
            onChange={(e) => setResponses([e.target.value])}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
          />
          {problem.numericAnswer && !submitted && (
            <p className="input-guide">
              ✏️ 분수는 <b>분자/분모</b>, 대분수는 <b>1과 3/10</b> 처럼 입력해요
            </p>
          )}
        </>
      )}

      {submitted && result && (
        <div className={`feedback ${result.correct ? 'good' : 'bad'}`}>
          <div className="feedback-head">{result.correct ? '정답! 🎉' : '아쉬워요 😢'}</div>
          {!result.correct && (
            <div className="correct-answer">
              정답: <b>{correctAnswerText(problem)}</b>
            </div>
          )}
          {result.note && <div className="note-tip">💡 {result.note}</div>}
          {problem.explanation && <div className="explain">📘 풀이: {problem.explanation}</div>}
        </div>
      )}

      {!submitted ? (
        <button className="btn primary submit" disabled={!canSubmit} onClick={handleSubmit}>
          제출
        </button>
      ) : (
        <button className="btn primary submit" onClick={goNext}>
          {index + 1 >= total ? '결과 보기 ▶' : '다음 ▶'}
        </button>
      )}
    </div>
  )
}
