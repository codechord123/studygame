import { useEffect, useState } from 'react'
import { sampleQuiz } from './data/sampleQuiz'
import { QuestionCard } from './components/QuestionCard'
import { AiMaker } from './components/AiMaker'
import { store, type WrongNote } from './lib/storage'
import {
  type PlayerProfile,
  emptyProfile,
  normalizeProfile,
  levelProgress,
  petForLevel,
  comboMultiplier,
  computeScore,
  newlyEarnedBadges,
  BADGES,
  type Badge,
} from './game/gamification'
import {
  COSMETICS,
  cosmeticById,
  DAILY_MISSIONS,
  missionProgress,
  missionClaimable,
  leaderboard,
  type Cosmetic,
} from './game/progression'
import type { Problem } from './types/problem'

type Screen = 'home' | 'quiz' | 'result' | 'wrong' | 'ai' | 'shop' | 'missions' | 'ranking'

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
    store.loadProfile().then((p) => setProfile(normalizeProfile(p)))
    store.loadWrongNotes().then(setWrongNotes)
  }, [])

  async function persist(next: PlayerProfile) {
    setProfile(next)
    await store.saveProfile(next)
  }

  function buyCosmetic(c: Cosmetic) {
    if (profile.coins < c.price || profile.cosmetics.includes(c.id)) return
    persist({
      ...profile,
      coins: profile.coins - c.price,
      cosmetics: [...profile.cosmetics, c.id],
      equipped: c.id,
    })
  }
  function equipCosmetic(id: string | null) {
    persist({ ...profile, equipped: id })
  }
  function claimMission(id: string, reward: number) {
    if (profile.daily.claimed.includes(id)) return
    persist({
      ...profile,
      coins: profile.coins + reward,
      daily: { ...profile.daily, claimed: [...profile.daily.claimed, id] },
    })
  }

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
    const score = Math.round((s.correct / s.problems.length) * 100)
    const updated: PlayerProfile = {
      ...profile,
      xp: profile.xp + s.gained,
      coins: profile.coins + Math.round(s.gained / 5),
      bestCombo: Math.max(profile.bestCombo, s.bestCombo),
      solvedCount: profile.solvedCount + s.problems.length,
      correctCount: profile.correctCount + s.correct,
      bestScore: Math.max(profile.bestScore, score),
      daily: {
        ...profile.daily,
        solved: profile.daily.solved + s.problems.length,
        bestCombo: Math.max(profile.daily.bestCombo, s.bestCombo),
      },
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
      <Hud
        level={level}
        cur={cur}
        need={need}
        coins={profile.coins}
        pet={pet}
        cosmetic={cosmeticById(profile.equipped)?.emoji}
      />

      {screen === 'home' && (
        <Home
          unresolved={wrongNotes.filter((n) => !n.resolved).length}
          badges={profile.badges}
          onStart={() => startQuiz(sampleQuiz.problems)}
          onWrong={() => setScreen('wrong')}
          onAi={() => setScreen('ai')}
          onShop={() => setScreen('shop')}
          onMissions={() => setScreen('missions')}
          onRanking={() => setScreen('ranking')}
          claimable={DAILY_MISSIONS.some((m) => missionClaimable(m, profile.daily))}
        />
      )}

      {screen === 'ai' && (
        <AiMaker onBack={() => setScreen('home')} onUse={(problems) => startQuiz(problems)} />
      )}

      {screen === 'shop' && (
        <Shop
          profile={profile}
          onBuy={buyCosmetic}
          onEquip={equipCosmetic}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'missions' && (
        <Missions profile={profile} onClaim={claimMission} onBack={() => setScreen('home')} />
      )}

      {screen === 'ranking' && (
        <Ranking profile={profile} onBack={() => setScreen('home')} />
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
  coins: number
  pet: { emoji: string; name: string }
  cosmetic?: string
}) {
  return (
    <header className="hud">
      <div className="pet">
        <span className="pet-emoji">
          {props.cosmetic && <span className="pet-hat">{props.cosmetic}</span>}
          {props.pet.emoji}
        </span>
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
  onAi: () => void
  onShop: () => void
  onMissions: () => void
  onRanking: () => void
  claimable: boolean
}) {
  return (
    <main className="screen home">
      <h1 className="title">📐 분수의 덧셈과 뺄셈</h1>
      <p className="subtitle">수학 5-1 · 5단원 심화</p>

      <button className="btn primary big" onClick={props.onStart}>
        ▶ 학습 시작
      </button>
      <button className="btn accent big" onClick={props.onAi}>
        🤖 AI 문제 만들기
      </button>
      <button className="btn ghost big" onClick={props.onWrong}>
        📒 오답노트
        {props.unresolved > 0 && <span className="badge-count">{props.unresolved}</span>}
      </button>

      <nav className="home-nav">
        <button className="nav-btn" onClick={props.onMissions}>
          <span className="nav-emoji">🎯</span>일일미션
          {props.claimable && <span className="dot" />}
        </button>
        <button className="nav-btn" onClick={props.onShop}>
          <span className="nav-emoji">🛍️</span>펫 상점
        </button>
        <button className="nav-btn" onClick={props.onRanking}>
          <span className="nav-emoji">🏆</span>랭킹
        </button>
      </nav>

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

// ── 펫 상점 ───────────────────────────────────────────────────────
function Shop(props: {
  profile: PlayerProfile
  onBuy: (c: Cosmetic) => void
  onEquip: (id: string | null) => void
  onBack: () => void
}) {
  const { profile } = props
  return (
    <main className="screen shop">
      <h1 className="title">🛍️ 펫 상점</h1>
      <p className="subtitle">🪙 {profile.coins} 코인 · 문제를 맞히면 코인이 쌓여요</p>

      <button
        className={`btn ghost ${profile.equipped === null ? 'selected' : ''}`}
        onClick={() => props.onEquip(null)}
      >
        꾸미기 벗기
      </button>

      <div className="shop-grid">
        {COSMETICS.map((c) => {
          const owned = profile.cosmetics.includes(c.id)
          const equipped = profile.equipped === c.id
          const afford = profile.coins >= c.price
          return (
            <div key={c.id} className={`shop-item ${equipped ? 'equipped' : ''}`}>
              <span className="shop-emoji">{c.emoji}</span>
              <span className="shop-name">{c.name}</span>
              {owned ? (
                <button
                  className={`btn ${equipped ? 'primary' : 'ghost'} shop-btn`}
                  onClick={() => props.onEquip(c.id)}
                >
                  {equipped ? '착용 중' : '착용'}
                </button>
              ) : (
                <button
                  className="btn accent shop-btn"
                  disabled={!afford}
                  onClick={() => props.onBuy(c)}
                >
                  🪙 {c.price}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button className="btn ghost big" onClick={props.onBack}>
        홈으로
      </button>
    </main>
  )
}

// ── 일일 미션 ─────────────────────────────────────────────────────
function Missions(props: {
  profile: PlayerProfile
  onClaim: (id: string, reward: number) => void
  onBack: () => void
}) {
  const { daily } = props.profile
  return (
    <main className="screen missions">
      <h1 className="title">🎯 오늘의 미션</h1>
      <p className="subtitle">매일 0시에 새로워져요</p>

      <ul className="mission-list">
        {DAILY_MISSIONS.map((m) => {
          const prog = missionProgress(m, daily)
          const claimed = daily.claimed.includes(m.id)
          const canClaim = missionClaimable(m, daily)
          return (
            <li key={m.id} className={`mission ${claimed ? 'done' : ''}`}>
              <span className="mission-emoji">{m.emoji}</span>
              <div className="mission-body">
                <div className="mission-top">
                  <span className="mission-name">{m.name}</span>
                  <span className="mission-reward">🪙 {m.reward}</span>
                </div>
                <div className="mission-bar">
                  <div
                    className="mission-bar-fill"
                    style={{ width: `${(prog / m.goal) * 100}%` }}
                  />
                </div>
                <span className="mission-prog">
                  {prog} / {m.goal}
                </span>
              </div>
              <button
                className={`btn ${canClaim ? 'primary' : 'ghost'} claim-btn`}
                disabled={!canClaim}
                onClick={() => props.onClaim(m.id, m.reward)}
              >
                {claimed ? '완료 ✔' : canClaim ? '받기' : '진행중'}
              </button>
            </li>
          )
        })}
      </ul>

      <button className="btn ghost big" onClick={props.onBack}>
        홈으로
      </button>
    </main>
  )
}

// ── 랭킹 ──────────────────────────────────────────────────────────
function Ranking(props: { profile: PlayerProfile; onBack: () => void }) {
  const { rows, myRank } = leaderboard(props.profile)
  return (
    <main className="screen ranking">
      <h1 className="title">🏆 랭킹</h1>
      <p className="subtitle">최고 점수 기준 · 내 순위 {myRank}위</p>

      <ul className="rank-list">
        {rows.map((r, i) => (
          <li key={r.name + i} className={`rank-row ${r.me ? 'me' : ''}`}>
            <span className={`rank-no rank-${i + 1}`}>{i + 1}</span>
            <span className="rank-name">{r.name}</span>
            <span className="rank-score">{r.score}점</span>
          </li>
        ))}
      </ul>

      <p className="rank-hint">친구와의 실시간 대전은 Firebase 연동 시 추가됩니다.</p>
      <button className="btn ghost big" onClick={props.onBack}>
        홈으로
      </button>
    </main>
  )
}
