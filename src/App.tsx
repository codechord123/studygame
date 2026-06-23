import { useEffect, useState } from 'react'
import { sampleQuiz } from './data/sampleQuiz'
import { QuestionCard } from './components/QuestionCard'
import { store, type WrongNote } from './lib/storage'
import {
  type PlayerProfile,
  emptyProfile,
  levelProgress,
  petForLevel,
  comboMultiplier,
  computeScore,
  newlyEarnedBadges,
  BADGES,
  type Badge,
} from './game/gamification'
import type { Problem } from './types/problem'

type Screen = 'home' | 'quiz' | 'result' | 'wrong'

interface SessionState {
  problems: Problem[]
  i: number
  combo: number
  bestCombo: number
  correct: number
  gained: number
  wrong: WrongNote[]
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [profile, setProfile] = useState<PlayerProfile>(emptyProfile)
  const [session, setSession] = useState<SessionState | null>(null)
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([])
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([])

  useEffect(() => {
    store.loadProfile().then(setProfile)
    store.loadWrongNotes().then(setWrongNotes)
  }, [])

  const { level, cur, need } = levelProgress(profile.xp)
  const pet = petForLevel(level)

  function startQuiz(problems: Problem[]) {
    setSession({
      problems,
      i: 0,
      combo: 0,
      bestCombo: 0,
      correct: 0,
      gained: 0,
      wrong: [],
    })
    setEarnedBadges([])
    setScreen('quiz')
  }

  async function handleSubmit(r: {
    correct: boolean
    responses: string[]
    timeLeftRatio: number
  }) {
    if (!session) return
    const problem = session.problems[session.i]
    const combo = r.correct ? session.combo + 1 : 0
    const gained = r.correct
      ? computeScore({ basePoints: problem.points, combo, timeLeftRatio: r.timeLeftRatio })
      : 0

    const wrong = [...session.wrong]
    if (!r.correct) {
      const note: WrongNote = {
        problem,
        userResponses: r.responses,
        wrongAt: Date.now(),
        resolved: false,
      }
      wrong.push(note)
      await store.upsertWrongNote(note)
    } else {
      // 오답노트에 있던 문제를 맞히면 '해결'로 표시 (없으면 무해)
      await store.markResolved(problem.id)
    }

    const next: SessionState = {
      ...session,
      combo,
      bestCombo: Math.max(session.bestCombo, combo),
      correct: session.correct + (r.correct ? 1 : 0),
      gained: session.gained + gained,
      wrong,
      i: session.i + 1,
    }

    if (next.i >= next.problems.length) {
      await finishSession(next)
    } else {
      setSession(next)
    }
  }

  async function finishSession(s: SessionState) {
    const updated: PlayerProfile = {
      ...profile,
      xp: profile.xp + s.gained,
      coins: profile.coins + Math.round(s.gained / 5),
      bestCombo: Math.max(profile.bestCombo, s.bestCombo),
      solvedCount: profile.solvedCount + s.problems.length,
      correctCount: profile.correctCount + s.correct,
    }
    const perfect = s.correct === s.problems.length
    const fresh = newlyEarnedBadges({
      profile: updated,
      sessionCorrect: s.correct,
      sessionTotal: s.problems.length,
      sessionBestCombo: s.bestCombo,
      perfect,
    })
    updated.badges = [...updated.badges, ...fresh.map((b) => b.id)]
    setProfile(updated)
    setEarnedBadges(fresh)
    await store.saveProfile(updated)
    setWrongNotes(await store.loadWrongNotes())
    setSession(s)
    setScreen('result')
  }

  // ── 화면별 렌더 ─────────────────────────────────────────────────
  return (
    <div className="app">
      <Hud level={level} cur={cur} need={need} xp={profile.xp} coins={profile.coins} pet={pet} />

      {screen === 'home' && (
        <Home
          unresolved={wrongNotes.filter((n) => !n.resolved).length}
          badges={profile.badges}
          onStart={() => startQuiz(sampleQuiz.problems)}
          onWrong={() => setScreen('wrong')}
        />
      )}

      {screen === 'quiz' && session && (
        <QuestionCard
          key={session.problems[session.i].id}
          problem={session.problems[session.i]}
          index={session.i}
          total={session.problems.length}
          combo={session.combo}
          onSubmit={handleSubmit}
        />
      )}

      {screen === 'result' && session && (
        <Result
          session={session}
          earned={earnedBadges}
          onHome={() => setScreen('home')}
          onWrong={() => setScreen('wrong')}
        />
      )}

      {screen === 'wrong' && (
        <WrongBook
          notes={wrongNotes}
          onBack={() => setScreen('home')}
          onRetry={(notes) => startQuiz(notes.map((n) => n.problem))}
          onResolved={async (id) => {
            await store.markResolved(id)
            setWrongNotes(await store.loadWrongNotes())
          }}
        />
      )}
    </div>
  )
}

// ── HUD ───────────────────────────────────────────────────────────
function Hud(props: {
  level: number
  cur: number
  need: number
  xp: number
  coins: number
  pet: { emoji: string; name: string }
}) {
  return (
    <header className="hud">
      <div className="pet">
        <span className="pet-emoji">{props.pet.emoji}</span>
        <span className="pet-name">{props.pet.name}</span>
      </div>
      <div className="hud-bars">
        <div className="lvl-row">
          <span className="lvl">Lv.{props.level}</span>
          <div className="xp-bar">
            <div
              className="xp-fill"
              style={{ width: `${props.need ? (props.cur / props.need) * 100 : 0}%` }}
            />
          </div>
          <span className="xp-text">
            {props.cur}/{props.need}
          </span>
        </div>
      </div>
      <div className="coins">🪙 {props.coins}</div>
    </header>
  )
}

// ── 홈 ────────────────────────────────────────────────────────────
function Home(props: {
  unresolved: number
  badges: string[]
  onStart: () => void
  onWrong: () => void
}) {
  return (
    <main className="screen home">
      <h1 className="title">📐 분수의 덧셈과 뺄셈</h1>
      <p className="subtitle">수학 5-1 · 5단원 심화</p>

      <button className="btn primary big" onClick={props.onStart}>
        ▶ 학습 시작
      </button>
      <button className="btn ghost big" onClick={props.onWrong}>
        📒 오답노트
        {props.unresolved > 0 && <span className="badge-count">{props.unresolved}</span>}
      </button>

      <section className="badge-shelf">
        <h3>뱃지</h3>
        <div className="badge-grid">
          {BADGES.map((b) => {
            const has = props.badges.includes(b.id)
            return (
              <div key={b.id} className={`badge ${has ? 'earned' : 'locked'}`} title={b.desc}>
                <span className="badge-emoji">{has ? b.emoji : '🔒'}</span>
                <span className="badge-name">{b.name}</span>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}

// ── 결과 ──────────────────────────────────────────────────────────
function Result(props: {
  session: SessionState
  earned: Badge[]
  onHome: () => void
  onWrong: () => void
}) {
  const { session } = props
  const acc = Math.round((session.correct / session.problems.length) * 100)
  return (
    <main className="screen result">
      <h1 className="title">결과</h1>
      <div className="result-big">{acc}점</div>
      <p>
        {session.problems.length}문제 중 <b>{session.correct}</b>개 정답 · 최고{' '}
        <b>🔥 {session.bestCombo}</b> 콤보 (x{comboMultiplier(session.bestCombo).toFixed(1)})
      </p>
      <p className="gained">+{session.gained} XP</p>

      {props.earned.length > 0 && (
        <div className="earned">
          <h3>새 뱃지!</h3>
          <div className="badge-grid">
            {props.earned.map((b) => (
              <div key={b.id} className="badge earned pop">
                <span className="badge-emoji">{b.emoji}</span>
                <span className="badge-name">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn primary big" onClick={props.onHome}>
        홈으로
      </button>
      {session.wrong.length > 0 && (
        <button className="btn ghost big" onClick={props.onWrong}>
          틀린 {session.wrong.length}문제 복습
        </button>
      )}
    </main>
  )
}

// ── 오답노트 ──────────────────────────────────────────────────────
function WrongBook(props: {
  notes: WrongNote[]
  onBack: () => void
  onRetry: (notes: WrongNote[]) => void
  onResolved: (id: string) => void
}) {
  const unresolved = props.notes.filter((n) => !n.resolved)
  return (
    <main className="screen wrong">
      <h1 className="title">📒 오답노트</h1>
      {props.notes.length === 0 && <p className="empty">아직 틀린 문제가 없어요. 멋져요! ✨</p>}

      {unresolved.length > 0 && (
        <button className="btn primary big" onClick={() => props.onRetry(unresolved)}>
          틀린 {unresolved.length}문제 다시 풀기
        </button>
      )}

      <ul className="note-list">
        {props.notes.map((n) => (
          <li key={n.problem.id} className={`note ${n.resolved ? 'resolved' : ''}`}>
            <div className="note-head">
              <span className="note-unit">{n.problem.unit}</span>
              {n.resolved && <span className="resolved-tag">✔ 해결</span>}
            </div>
            <p className="note-prompt">{n.problem.prompt}</p>
            {n.problem.explanation && <p className="note-explain">💡 {n.problem.explanation}</p>}
          </li>
        ))}
      </ul>

      <button className="btn ghost big" onClick={props.onBack}>
        홈으로
      </button>
    </main>
  )
}
