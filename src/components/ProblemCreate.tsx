import { useMemo, useState } from 'react'
import { VILLAGERS, type Villager } from '../game/world'
import { unitNamesFor, type CustomStore } from '../data/customContent'
import type { Problem, ProblemType } from '../types/problem'

export interface EditTarget {
  villagerId: string
  unitName: string
  problem: Problem
}

interface Props {
  store: CustomStore
  initialVillager?: Villager | null
  editing?: EditTarget | null
  onSave: (villagerId: string, unitName: string, problem: Problem) => void
  onUpdate?: (villagerId: string, unitName: string, problem: Problem) => void
  onBack: () => void
}

// 학생/교사가 직접 문제를 만드는 폼: 과목·단원 → 유형 → 문제·답지 → 사진(선택).
// editing 이 주어지면 같은 폼이 '수정' 모드로 동작한다.
export function ProblemCreate({ store, initialVillager, editing, onSave, onUpdate, onBack }: Props) {
  const ep = editing?.problem
  const [villagerId, setVillagerId] = useState(editing?.villagerId ?? initialVillager?.id ?? VILLAGERS[0].id)
  const villager = VILLAGERS.find((v) => v.id === villagerId)!
  const unitNames = useMemo(
    () => unitNamesFor(villagerId, villager.subject, store),
    [villagerId, villager.subject, store],
  )
  const [unitMode, setUnitMode] = useState<'existing' | 'new'>(
    editing || unitNames.length ? 'existing' : 'new',
  )
  const [unitExisting, setUnitExisting] = useState(editing?.unitName ?? unitNames[0] ?? '')
  const [unitNew, setUnitNew] = useState('')
  const [type, setType] = useState<ProblemType>(ep?.type ?? 'multiple_choice')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(ep?.difficulty ?? 1)
  const [prompt, setPrompt] = useState(ep?.prompt ?? '')
  const [choices, setChoices] = useState<string[]>(
    ep?.type === 'multiple_choice'
      ? [...ep.choices, '', '', '', ''].slice(0, Math.max(4, ep.choices.length))
      : ['', '', '', ''],
  )
  const [answerIndex, setAnswerIndex] = useState(ep?.type === 'multiple_choice' ? ep.answer : 0)
  const [answers, setAnswers] = useState(ep?.type === 'short_answer' ? ep.answers.join(', ') : '')
  const [numeric, setNumeric] = useState(
    (ep?.type === 'short_answer' || ep?.type === 'fill_blank') && !!ep.numericAnswer,
  )
  const [oxAnswer, setOxAnswer] = useState(ep?.type === 'ox' ? ep.answer : true)
  const [blankAnswers, setBlankAnswers] = useState(
    ep?.type === 'fill_blank' ? (ep.blanks[0] ?? []).join(', ') : '',
  )
  const [explanation, setExplanation] = useState(ep?.explanation ?? '')
  const [image, setImage] = useState<string | null>(ep?.image ?? null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const unitName = unitMode === 'new' ? unitNew.trim() : unitExisting

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(f)
  }

  function reset() {
    setPrompt('')
    setChoices(['', '', '', ''])
    setAnswerIndex(0)
    setAnswers('')
    setBlankAnswers('')
    setExplanation('')
    setImage(null)
  }

  function build(): Problem | null {
    if (!unitName) return setError('단원을 정해 주세요.'), null
    if (!prompt.trim()) return setError('문제를 입력해 주세요.'), null
    const base = {
      id: ep?.id ?? 'u-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      subject: villager.subject,
      grade: ep?.grade ?? '',
      unit: unitName,
      difficulty,
      points: difficulty === 3 ? 20 : difficulty === 2 ? 15 : 10,
      prompt: prompt.trim(),
      explanation: explanation.trim() || undefined,
      image: image || undefined,
    }
    if (type === 'multiple_choice') {
      const cs = choices.map((c) => c.trim()).filter(Boolean)
      if (cs.length < 2) return setError('보기를 2개 이상 입력해 주세요.'), null
      if (answerIndex >= cs.length) return setError('정답 보기를 골라 주세요.'), null
      return { ...base, type: 'multiple_choice', choices: cs, answer: answerIndex }
    }
    if (type === 'short_answer') {
      const a = answers.split(',').map((x) => x.trim()).filter(Boolean)
      if (!a.length) return setError('정답(답지)을 입력해 주세요.'), null
      return { ...base, type: 'short_answer', answers: a, numericAnswer: numeric }
    }
    if (type === 'ox') {
      return { ...base, type: 'ox', answer: oxAnswer }
    }
    // fill_blank
    const ba = blankAnswers.split(',').map((x) => x.trim()).filter(Boolean)
    if (!ba.length) return setError('빈칸 정답을 입력해 주세요.'), null
    const p = base.prompt.includes('{{0}}') ? base.prompt : base.prompt + ' {{0}}'
    return { ...base, prompt: p, type: 'fill_blank', blanks: [ba], numericAnswer: numeric }
  }

  function submit() {
    setError(null)
    const problem = build()
    if (!problem) return
    if (editing && onUpdate) {
      onUpdate(villagerId, unitName, problem)
      setSaved('수정했어요!')
      window.setTimeout(onBack, 600)
      return
    }
    onSave(villagerId, unitName, problem)
    setSaved(`${villager.subject} · ${unitName} 에 저장됐어요!`)
    if (unitMode === 'new') {
      setUnitMode('existing')
      setUnitExisting(unitName)
      setUnitNew('')
    }
    reset()
  }

  return (
    <main className="screen create">
      <h1 className="title">{editing ? '✏️ 문제 수정' : '✏️ 문제 만들기'}</h1>
      <p className="subtitle">
        {editing ? '내용을 고치고 저장하세요' : '과목·단원을 고르고 문제와 답지를 적어요'}
      </p>

      {saved && <div className="feedback good">{saved}</div>}
      {error && <div className="feedback bad">{error}</div>}

      <label className="field">
        <span className="field-label">과목</span>
        <select className="field-input" value={villagerId} disabled={!!editing} onChange={(e) => setVillagerId(e.target.value)}>
          {VILLAGERS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.emoji} {v.subject}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">단원</span>
        <div className="unit-pick">
          {unitNames.length > 0 && (
            <select
              className="field-input"
              disabled={!!editing}
              value={unitMode === 'existing' ? unitExisting : '__new__'}
              onChange={(e) => {
                if (e.target.value === '__new__') setUnitMode('new')
                else {
                  setUnitMode('existing')
                  setUnitExisting(e.target.value)
                }
              }}
            >
              {unitNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="__new__">+ 새 단원</option>
            </select>
          )}
          {(unitMode === 'new' || unitNames.length === 0) && (
            <input
              className="field-input"
              placeholder="새 단원 이름"
              value={unitNew}
              onChange={(e) => {
                setUnitMode('new')
                setUnitNew(e.target.value)
              }}
            />
          )}
        </div>
      </label>

      <div className="field">
        <span className="field-label">문제 유형 — 골라요</span>
        <div className="type-grid">
          {(
            [
              { v: 'multiple_choice', emoji: '✅', label: '객관식', hint: '보기에서 답 고르기' },
              { v: 'short_answer', emoji: '✍️', label: '주관식', hint: '직접 답 쓰기 (보기 없음)' },
              { v: 'ox', emoji: '⭕❌', label: 'OX', hint: '맞다 / 틀리다' },
              { v: 'fill_blank', emoji: '🔲', label: '빈칸', hint: '빈칸 채우기' },
            ] as const
          ).map((t) => (
            <button
              key={t.v}
              className={`type-btn ${type === t.v ? 'on' : ''}`}
              onClick={() => setType(t.v as ProblemType)}
            >
              <span className="type-emoji">{t.emoji}</span>
              <span className="type-label">{t.label}</span>
              <span className="type-hint">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">문제</span>
        <textarea className="field-input ta" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="문제를 입력하세요" />
      </label>

      {/* 사진 첨부 */}
      <label className="upload-box small">
        {image ? <img src={image} className="upload-preview" alt="첨부" /> : <span className="upload-hint">📷 사진 첨부 (선택)</span>}
        <input type="file" accept="image/*" capture="environment" hidden onChange={handleImage} />
      </label>
      {image && (
        <button className="btn ghost" onClick={() => setImage(null)}>
          사진 제거
        </button>
      )}

      {/* 유형별 답지 */}
      {type === 'multiple_choice' && (
        <div className="field">
          <span className="field-label">보기 입력 · 정답은 왼쪽 ○ 선택</span>
          {choices.map((c, idx) => (
            <div key={idx} className="choice-row">
              <input
                type="radio"
                name="ans"
                checked={answerIndex === idx}
                onChange={() => setAnswerIndex(idx)}
              />
              <input
                className="field-input"
                value={c}
                placeholder={`보기 ${idx + 1}`}
                onChange={(e) => setChoices((cs) => cs.map((x, j) => (j === idx ? e.target.value : x)))}
              />
            </div>
          ))}
          <span className="hint-sub">왼쪽 ○ 가 정답</span>
        </div>
      )}

      {type === 'short_answer' && (
        <div className="field">
          <span className="field-label">정답 (답지) — 여러 개면 쉼표</span>
          <input className="field-input" value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder="예: 17/20, 1과 3/10" />
          <label className="check-row">
            <input type="checkbox" checked={numeric} onChange={(e) => setNumeric(e.target.checked)} /> 분수/숫자 답 (값으로 비교)
          </label>
        </div>
      )}

      {type === 'ox' && (
        <div className="field">
          <span className="field-label">정답</span>
          <div className="ox-pick">
            <button className={`btn ${oxAnswer ? 'primary' : 'ghost'}`} onClick={() => setOxAnswer(true)}>
              ⭕ 맞음
            </button>
            <button className={`btn ${!oxAnswer ? 'primary' : 'ghost'}`} onClick={() => setOxAnswer(false)}>
              ❌ 틀림
            </button>
          </div>
        </div>
      )}

      {type === 'fill_blank' && (
        <div className="field">
          <span className="field-label">빈칸 정답 — 여러 표기면 쉼표</span>
          <input className="field-input" value={blankAnswers} onChange={(e) => setBlankAnswers(e.target.value)} placeholder="예: 7/10" />
          <span className="hint-sub">문제에 빈칸 자리를 {'{{0}}'} 로 표시 (없으면 끝에 추가됨)</span>
          <label className="check-row">
            <input type="checkbox" checked={numeric} onChange={(e) => setNumeric(e.target.checked)} /> 분수/숫자 답
          </label>
        </div>
      )}

      <label className="field">
        <span className="field-label">풀이/해설 (선택)</span>
        <textarea className="field-input ta" rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="왜 그런지 설명" />
      </label>

      <label className="field">
        <span className="field-label">난이도</span>
        <select className="field-input" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}>
          <option value={1}>쉬움</option>
          <option value={2}>보통</option>
          <option value={3}>어려움</option>
        </select>
      </label>

      <button className="btn primary big" onClick={submit}>
        💾 저장하기
      </button>
      <button className="btn ghost big" onClick={onBack}>
        돌아가기
      </button>
    </main>
  )
}
