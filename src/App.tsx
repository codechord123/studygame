import { useEffect, useState } from 'react'
import { QuestionCard, type PlayMode } from './components/QuestionCard'
import { AiMaker } from './components/AiMaker'
import { store, type WrongNote } from './lib/storage'
import {
  type PlayerProfile,
  emptyProfile,
  normalizeProfile,
  levelProgress,
  comboMultiplier,
  computeScore,
  newlyEarnedBadges,
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
  type RankEntry,
} from './game/progression'
import {
  TOWN_NAME,
  AVATARS,
  titleForLevel,
  VILLAGERS,
  friendHearts,
  FURNITURE,
  furnitureById,
  INTRO_STORY,
  type Villager,
  type Furniture,
} from './game/world'
import { VILLAGER_PROBLEMS } from './data/villagerQuizzes'
import type { Problem } from './types/problem'

type Screen = 'town' | 'quiz' | 'result' | 'wrong' | 'ai' | 'shop' | 'missions' | 'ranking' | 'room'

interface SessionState {
  problems: Problem[]
  mode: PlayMode
  villagerId?: string
  villagerName?: string
  i: number
  combo: number
  bestCombo: number
  correct: number
  gained: number
  wrong: WrongNote[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function prepareProblems(problems: Problem[], mode: PlayMode, wrongIds: Set<string>): Problem[] {
  if (mode === 'challenge') return shuffle(problems)
  const wrong = problems.filter((p) => wrongIds.has(p.id))
  const rest = problems.filter((p) => !wrongIds.has(p.id))
  return [...wrong, ...rest]
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [screen, setScreen] = useState<Screen>('town')
  const [profile, setProfile] = useState<PlayerProfile>(emptyProfile)
  const [session, setSession] = useState<SessionState | null>(null)
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([])
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([])
  const [aiVillager, setAiVillager] = useState<Villager | null>(null)

  useEffect(() => {
    store.loadProfile().then((p) => {
      setProfile(normalizeProfile(p))
      setLoaded(true)
    })
    store.loadWrongNotes().then(setWrongNotes)
  }, [])

  async function persist(next: PlayerProfile) {
    setProfile(next)
    await store.saveProfile(next)
  }

  function finishOnboarding(name: string, avatar: string) {
    persist({ ...profile, onboarded: true, characterName: name || '이웃', avatar })
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
  function buyFurniture(f: Furniture) {
    if (profile.coins < f.price || profile.furniture.includes(f.id)) return
    persist({ ...profile, coins: profile.coins - f.price, furniture: [...profile.furniture, f.id] })
  }
  function setAvatar(avatar: string) {
    persist({ ...profile, avatar })
  }
  function renameCharacter(name: string) {
    const next = { ...profile, characterName: name }
    persist(next)
    if (next.bestScore > 0) store.submitScore?.(name, next.bestScore).catch(() => {})
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

  function startQuiz(problems: Problem[], mode: PlayMode, villager?: Villager) {
    const wrongIds = new Set(wrongNotes.filter((n) => !n.resolved).map((n) => n.problem.id))
    setSession({
      problems: prepareProblems(problems, mode, wrongIds),
      mode,
      villagerId: villager?.id,
      villagerName: villager?.name,
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

  async function handleSubmit(r: { correct: boolean; responses: string[]; timeLeftRatio: number }) {
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
    const friendGain = s.villagerId ? s.correct * 4 + 4 : 0
    const villagerFriends = { ...profile.villagerFriends }
    if (s.villagerId) {
      villagerFriends[s.villagerId] = (villagerFriends[s.villagerId] ?? 0) + friendGain
    }
    const updated: PlayerProfile = {
      ...profile,
      xp: profile.xp + s.gained,
      coins: profile.coins + Math.round(s.gained / 5),
      bestCombo: Math.max(profile.bestCombo, s.bestCombo),
      solvedCount: profile.solvedCount + s.problems.length,
      correctCount: profile.correctCount + s.correct,
      bestScore: Math.max(profile.bestScore, score),
      villagerFriends,
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
    if (updated.bestScore > profile.bestScore && updated.characterName) {
      store.submitScore?.(updated.characterName, updated.bestScore).catch(() => {})
    }
    setWrongNotes(await store.loadWrongNotes())
    setSession({ ...s, gained: s.gained })
    setScreen('result')
  }

  function talkAndStudy(v: Villager, mode: PlayMode) {
    const problems = VILLAGER_PROBLEMS[v.id]
    if (problems && problems.length) startQuiz(problems, mode, v)
  }
  function makeForVillager(v: Villager) {
    setAiVillager(v)
    setScreen('ai')
  }

  if (!loaded) {
    return (
      <div className="app">
        <div className="splash">🌙 별숲 마을로 가는 중…</div>
      </div>
    )
  }

  if (!profile.onboarded) {
    return <Onboarding onDone={finishOnboarding} />
  }

  return (
    <div className="app">
      <Hud
        avatar={profile.avatar}
        name={profile.characterName}
        title={titleForLevel(level)}
        level={level}
        cur={cur}
        need={need}
        coins={profile.coins}
        cosmetic={cosmeticById(profile.equipped)?.emoji}
        onProfile={() => setScreen('room')}
      />

      {screen === 'town' && (
        <Town
          profile={profile}
          claimable={DAILY_MISSIONS.some((m) => missionClaimable(m, profile.daily))}
          unresolved={wrongNotes.filter((n) => !n.resolved).length}
          onStudy={(v, mode) => talkAndStudy(v, mode)}
          onMake={makeForVillager}
          onNav={(s) => setScreen(s)}
        />
      )}

      {screen === 'quiz' && session && (
        <QuestionCard
          key={session.problems[session.i].id}
          problem={session.problems[session.i]}
          index={session.i}
          total={session.problems.length}
          combo={session.combo}
          mode={session.mode}
          onSubmit={handleSubmit}
        />
      )}

      {screen === 'result' && session && (
        <Result
          session={session}
          earned={earnedBadges}
          friends={profile.villagerFriends}
          onHome={() => setScreen('town')}
          onWrong={() => setScreen('wrong')}
        />
      )}

      {screen === 'ai' && (
        <AiMaker
          villagerName={aiVillager?.name}
          onBack={() => {
            setAiVillager(null)
            setScreen('town')
          }}
          onUse={(problems) => {
            const v = aiVillager ?? undefined
            setAiVillager(null)
            startQuiz(problems, 'study', v)
          }}
        />
      )}

      {screen === 'shop' && (
        <Shop
          profile={profile}
          onBuy={buyCosmetic}
          onEquip={equipCosmetic}
          onBuyFurniture={buyFurniture}
          onBack={() => setScreen('town')}
        />
      )}

      {screen === 'room' && (
        <Room
          profile={profile}
          level={level}
          onAvatar={setAvatar}
          onRename={renameCharacter}
          onShop={() => setScreen('shop')}
          onBack={() => setScreen('town')}
        />
      )}

      {screen === 'missions' && (
        <Missions profile={profile} onClaim={claimMission} onBack={() => setScreen('town')} />
      )}

      {screen === 'ranking' && (
        <Ranking profile={profile} onRename={renameCharacter} onBack={() => setScreen('town')} />
      )}

      {screen === 'wrong' && (
        <WrongBook
          notes={wrongNotes}
          onBack={() => setScreen('town')}
          onRetry={(notes) => startQuiz(notes.map((n) => n.problem), 'study')}
          onResolved={async (id) => {
            await store.markResolved(id)
            setWrongNotes(await store.loadWrongNotes())
          }}
        />
      )}
    </div>
  )
}

// ── 온보딩 (첫 이사 + 서사) ───────────────────────────────────────
function Onboarding(props: { onDone: (name: string, avatar: string) => void }) {
  const [step, setStep] = useState(0) // 0..story, then setup
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [name, setName] = useState('')
  const storyDone = step >= INTRO_STORY.length

  return (
    <div className="app onboarding">
      {!storyDone ? (
        <main className="screen story">
          <div className="story-emoji">{['🚂', '🌌', '🏡', '💬', '✨'][step] ?? '✨'}</div>
          <p className="story-text">{INTRO_STORY[step]}</p>
          <button className="btn primary big" onClick={() => setStep((s) => s + 1)}>
            {step + 1 >= INTRO_STORY.length ? '내 캐릭터 만들기 ▶' : '다음 ▶'}
          </button>
        </main>
      ) : (
        <main className="screen setup">
          <h1 className="title">나의 캐릭터</h1>
          <p className="subtitle">{TOWN_NAME}에서 살아갈 내 모습을 골라요</p>
          <div className="avatar-pick">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={`avatar-opt ${avatar === a ? 'sel' : ''}`}
                onClick={() => setAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            className="answer-input"
            placeholder="이름을 지어주세요 (예: 하랑)"
            maxLength={10}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="btn primary big"
            disabled={!name.trim()}
            onClick={() => props.onDone(name.trim(), avatar)}
          >
            별숲 마을로! 🌟
          </button>
        </main>
      )}
    </div>
  )
}

// ── HUD ───────────────────────────────────────────────────────────
function Hud(props: {
  avatar: string
  name: string
  title: string
  level: number
  cur: number
  need: number
  coins: number
  cosmetic?: string
  onProfile: () => void
}) {
  return (
    <header className="hud">
      <button className="pet" onClick={props.onProfile} title="내 방">
        <span className="pet-emoji">
          {props.cosmetic && <span className="pet-hat">{props.cosmetic}</span>}
          {props.avatar}
        </span>
      </button>
      <div className="hud-bars">
        <div className="hud-id">
          <b>{props.name}</b> <span className="hud-title">{props.title}</span>
        </div>
        <div className="lvl-row">
          <span className="lvl">Lv.{props.level}</span>
          <div className="xp-bar">
            <div
              className="xp-fill"
              style={{ width: `${props.need ? (props.cur / props.need) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
      <div className="coins">🔔 {props.coins}</div>
    </header>
  )
}

// ── 마을 허브 ─────────────────────────────────────────────────────
function Town(props: {
  profile: PlayerProfile
  claimable: boolean
  unresolved: number
  onStudy: (v: Villager, mode: PlayMode) => void
  onMake: (v: Villager) => void
  onNav: (s: Screen) => void
}) {
  const [active, setActive] = useState<Villager | null>(null)

  return (
    <main className="screen town">
      <div className="town-sky">
        <h1 className="town-title">🌳 {TOWN_NAME}</h1>
        <p className="town-sub">
          {props.profile.characterName}의 마을 · 별 {props.profile.correctCount}개 반짝
        </p>
      </div>

      <h3 className="section-label">마을 친구들 — 말을 걸어 같이 공부해요</h3>
      <div className="villager-grid">
        {VILLAGERS.map((v) => {
          const hearts = friendHearts(props.profile.villagerFriends[v.id] ?? 0)
          return (
            <button key={v.id} className="villager" onClick={() => setActive(v)}>
              <span className="villager-emoji">{v.emoji}</span>
              <span className="villager-name">{v.name}</span>
              <span className="villager-subject">{v.subject}</span>
              <span className="hearts">{'❤️'.repeat(hearts) || '🤍'}</span>
            </button>
          )
        })}
      </div>

      <h3 className="section-label">마을 시설</h3>
      <div className="building-grid">
        <BuildingBtn emoji="🏠" label="내 집" onClick={() => props.onNav('room')} />
        <BuildingBtn emoji="🛍️" label="상점" onClick={() => props.onNav('shop')} />
        <BuildingBtn
          emoji="🎯"
          label="게시판"
          badge={props.claimable}
          onClick={() => props.onNav('missions')}
        />
        <BuildingBtn emoji="🏆" label="명예의 별" onClick={() => props.onNav('ranking')} />
        <BuildingBtn
          emoji="📒"
          label="오답노트"
          count={props.unresolved}
          onClick={() => props.onNav('wrong')}
        />
        <BuildingBtn emoji="🤖" label="문제공방" onClick={() => props.onNav('ai')} />
      </div>

      {active && (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">{active.emoji}</div>
            <div className="modal-name">
              {active.name} <span className="modal-subject">· {active.subject}</span>
            </div>
            <p className="modal-line">
              “
              {friendHearts(props.profile.villagerFriends[active.id] ?? 0) >= 3
                ? active.bond
                : active.greeting}
              ”
            </p>
            <button
              className="btn primary big"
              onClick={() => {
                const v = active
                setActive(null)
                props.onStudy(v, 'study')
              }}
            >
              📖 같이 공부하기
            </button>
            <button
              className="btn challenge big"
              onClick={() => {
                const v = active
                setActive(null)
                props.onStudy(v, 'challenge')
              }}
            >
              ⚡ 도전 모드
            </button>
            <button
              className="btn accent big"
              onClick={() => {
                const v = active
                setActive(null)
                props.onMake(v)
              }}
            >
              🤖 {active.subject} 문제 더 만들기
            </button>
            <button className="btn ghost big" onClick={() => setActive(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function BuildingBtn(props: {
  emoji: string
  label: string
  badge?: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button className="building" onClick={props.onClick}>
      <span className="building-emoji">{props.emoji}</span>
      <span className="building-label">{props.label}</span>
      {props.badge && <span className="dot" />}
      {props.count ? <span className="badge-count sm">{props.count}</span> : null}
    </button>
  )
}

// ── 내 집 (정체성/꾸미기) ─────────────────────────────────────────
function Room(props: {
  profile: PlayerProfile
  level: number
  onAvatar: (a: string) => void
  onRename: (n: string) => void
  onShop: () => void
  onBack: () => void
}) {
  const { profile } = props
  const [name, setName] = useState(profile.characterName)
  const placed = profile.furniture.map(furnitureById).filter(Boolean) as Furniture[]
  const hat = cosmeticById(profile.equipped)?.emoji

  return (
    <main className="screen room">
      <h1 className="title">🏠 {profile.characterName}의 집</h1>

      <div className="room-stage">
        <div className="room-floor">
          {placed.length === 0 ? (
            <span className="room-empty">상점에서 가구를 사면 여기에 놓여요</span>
          ) : (
            placed.map((f) => (
              <span key={f.id} className="furni" title={f.name}>
                {f.emoji}
              </span>
            ))
          )}
        </div>
        <div className="room-avatar">
          {hat && <span className="pet-hat big">{hat}</span>}
          {profile.avatar}
        </div>
      </div>

      <p className="subtitle">
        {titleForLevel(props.level)} · Lv.{props.level}
      </p>

      <h3 className="section-label">내 모습 바꾸기</h3>
      <div className="avatar-pick">
        {AVATARS.map((a) => (
          <button
            key={a}
            className={`avatar-opt ${profile.avatar === a ? 'sel' : ''}`}
            onClick={() => props.onAvatar(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="hint-row">
        <input
          className="hint-input"
          value={name}
          maxLength={10}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
        />
        <button className="btn primary" onClick={() => props.onRename(name.trim() || profile.characterName)}>
          이름 저장
        </button>
      </div>

      <button className="btn accent big" onClick={props.onShop}>
        🛍️ 옷·가구 사러 가기
      </button>
      <button className="btn ghost big" onClick={props.onBack}>
        마을로
      </button>
    </main>
  )
}

// ── 상점 (옷 / 가구 탭) ───────────────────────────────────────────
function Shop(props: {
  profile: PlayerProfile
  onBuy: (c: Cosmetic) => void
  onEquip: (id: string | null) => void
  onBuyFurniture: (f: Furniture) => void
  onBack: () => void
}) {
  const { profile } = props
  const [tab, setTab] = useState<'clothes' | 'furniture'>('clothes')
  return (
    <main className="screen shop">
      <h1 className="title">🛍️ 마을 상점</h1>
      <p className="subtitle">🔔 {profile.coins} 벨 · 문제를 풀면 벨이 모여요</p>

      <div className="tab-row">
        <button className={`tab ${tab === 'clothes' ? 'on' : ''}`} onClick={() => setTab('clothes')}>
          👒 옷·모자
        </button>
        <button
          className={`tab ${tab === 'furniture' ? 'on' : ''}`}
          onClick={() => setTab('furniture')}
        >
          🪑 가구
        </button>
      </div>

      {tab === 'clothes' ? (
        <>
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
                      🔔 {c.price}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="shop-grid">
          {FURNITURE.map((f) => {
            const owned = profile.furniture.includes(f.id)
            const afford = profile.coins >= f.price
            return (
              <div key={f.id} className={`shop-item ${owned ? 'equipped' : ''}`}>
                <span className="shop-emoji">{f.emoji}</span>
                <span className="shop-name">{f.name}</span>
                {owned ? (
                  <button className="btn ghost shop-btn" disabled>
                    보유 중
                  </button>
                ) : (
                  <button
                    className="btn accent shop-btn"
                    disabled={!afford}
                    onClick={() => props.onBuyFurniture(f)}
                  >
                    🔔 {f.price}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button className="btn ghost big" onClick={props.onBack}>
        마을로
      </button>
    </main>
  )
}

// ── 결과 ──────────────────────────────────────────────────────────
function Result(props: {
  session: SessionState
  earned: Badge[]
  friends: Record<string, number>
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
      <p className="gained">+{session.gained} 경험치 · +{Math.round(session.gained / 5)} 벨</p>

      {session.villagerName && (
        <p className="friend-gain">
          {session.villagerName}와(과) 더 친해졌어요! ❤️ (+{session.correct * 4 + 4})
        </p>
      )}

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
        마을로 돌아가기
      </button>
      {session.wrong.length > 0 && (
        <button className="btn ghost big" onClick={props.onWrong}>
          틀린 {session.wrong.length}문제 복습
        </button>
      )}
    </main>
  )
}

// ── 일일 미션 (게시판) ────────────────────────────────────────────
function Missions(props: {
  profile: PlayerProfile
  onClaim: (id: string, reward: number) => void
  onBack: () => void
}) {
  const { daily } = props.profile
  return (
    <main className="screen missions">
      <h1 className="title">🎯 마을 게시판</h1>
      <p className="subtitle">매일 0시에 새 부탁이 올라와요</p>

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
                  <span className="mission-reward">🔔 {m.reward}</span>
                </div>
                <div className="mission-bar">
                  <div className="mission-bar-fill" style={{ width: `${(prog / m.goal) * 100}%` }} />
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
        마을로
      </button>
    </main>
  )
}

// ── 랭킹 (명예의 별) ──────────────────────────────────────────────
function Ranking(props: {
  profile: PlayerProfile
  onRename: (n: string) => void
  onBack: () => void
}) {
  const live = Boolean(store.loadLeaderboard)
  const [rows, setRows] = useState<RankEntry[]>(() => leaderboard(props.profile).rows)
  const [name, setName] = useState(props.profile.characterName)

  useEffect(() => {
    if (!store.loadLeaderboard) return
    store
      .loadLeaderboard()
      .then((data) => {
        if (data.length > 0) setRows(data)
      })
      .catch(() => {})
  }, [])

  const myRank = rows.findIndex((r) => r.me) + 1

  async function save() {
    props.onRename(name.trim() || props.profile.characterName)
    const data = await store.loadLeaderboard?.()
    if (data && data.length) setRows(data)
  }

  return (
    <main className="screen ranking">
      <h1 className="title">🏆 명예의 별</h1>
      <p className="subtitle">
        최고 점수 기준{myRank > 0 ? ` · 내 순위 ${myRank}위` : ''}
        {live ? ' · 실시간' : ' · 로컬'}
      </p>

      {live && (
        <div className="hint-row">
          <input
            className="hint-input"
            value={name}
            maxLength={12}
            onChange={(e) => setName(e.target.value)}
            placeholder="내 이름"
          />
          <button className="btn primary" onClick={save}>
            저장
          </button>
        </div>
      )}

      <ul className="rank-list">
        {rows.map((r, i) => (
          <li key={r.name + i} className={`rank-row ${r.me ? 'me' : ''}`}>
            <span className={`rank-no rank-${i + 1}`}>{i + 1}</span>
            <span className="rank-name">{r.name}</span>
            <span className="rank-score">{r.score}점</span>
          </li>
        ))}
      </ul>

      {!live && (
        <p className="rank-hint">Firebase 설정 시 실제 친구들과 순위를 겨뤄요.</p>
      )}
      <button className="btn ghost big" onClick={props.onBack}>
        마을로
      </button>
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
              <span className="note-unit">
                {n.problem.subject} · {n.problem.unit}
              </span>
              {n.resolved && <span className="resolved-tag">✔ 해결</span>}
            </div>
            <p className="note-prompt">{n.problem.prompt}</p>
            {n.problem.explanation && <p className="note-explain">💡 {n.problem.explanation}</p>}
          </li>
        ))}
      </ul>

      <button className="btn ghost big" onClick={props.onBack}>
        마을로
      </button>
    </main>
  )
}
