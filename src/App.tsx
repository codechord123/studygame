import { useEffect, useRef, useState } from 'react'
import { QuestionCard, type PlayMode } from './components/QuestionCard'
import { TownMap, type FacilityScreen } from './components/TownMap'
import { AiMaker } from './components/AiMaker'
import { PhaserGame } from './react/game/PhaserGame'
import { bridge } from './game/bridge'
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
  FURNITURE,
  furnitureById,
  INTRO_STORY,
  HOUSE_STAGES,
  houseInfo,
  nextHouseCost,
  CLASSMATES,
  villagerById,
  type Villager,
  type Furniture,
  type Classmate,
} from './game/world'
import { orderByMastery, updateEntry, type MasteryMap } from './game/mastery'
import { subjectStats, unitCards, trophies, completedUnitKeys, UNIT_REWARD } from './game/collection'
import { VILLAGER_PROBLEMS } from './data/villagerQuizzes'
import type { Problem } from './types/problem'

type Screen =
  | 'town'
  | 'quiz'
  | 'result'
  | 'wrong'
  | 'ai'
  | 'shop'
  | 'missions'
  | 'ranking'
  | 'room'
  | 'game'
  | 'dex'
  | 'dashboard'

function getCarrots(): number {
  return Number(localStorage.getItem('sg.carrots') || '0')
}
function addCarrots(n: number) {
  localStorage.setItem('sg.carrots', String(getCarrots() + n))
}

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
  masteryUpdates: MasteryMap // 이번 세션의 문항별 숙련도 변화
  fromGame?: boolean // Phaser 게임에서 시작된 세션(오버레이)
  plotId?: string // 채집밭에서 시작된 경우
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 학습 모드: 숙련도 기반 출제(안 푼 것→틀린 것→덜 익숙한 것 순) / 도전: 셔플
function prepareProblems(problems: Problem[], mode: PlayMode, mastery: MasteryMap): Problem[] {
  return mode === 'challenge' ? shuffle(problems) : orderByMastery(problems, mastery)
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [screen, setScreen] = useState<Screen>('town')
  const [profile, setProfile] = useState<PlayerProfile>(emptyProfile)
  const [session, setSession] = useState<SessionState | null>(null)
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([])
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([])
  const [aiVillager, setAiVillager] = useState<Villager | null>(null)
  const [classmates, setClassmates] = useState<Classmate[]>(CLASSMATES)
  const [gameSession, setGameSession] = useState<SessionState | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const bridgeRef = useRef<{
    ui: (d: { type: FacilityScreen }) => void
    villager: (d: { id: string }) => void
    harvest: (d: { plotId: string; subject: string }) => void
  } | null>(null)

  useEffect(() => {
    store.loadProfile().then((p) => {
      setProfile(normalizeProfile(p))
      setLoaded(true)
    })
    store.loadWrongNotes().then(setWrongNotes)
    if (store.loadClassmates) {
      store
        .loadClassmates()
        .then((d) => {
          if (d.length > 0) setClassmates(d)
        })
        .catch(() => {})
    }
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
    store.syncProfile?.(next).catch(() => {})
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
    setSession({
      problems: prepareProblems(problems, mode, profile.mastery),
      mode,
      villagerId: villager?.id,
      villagerName: villager?.name,
      i: 0,
      combo: 0,
      bestCombo: 0,
      correct: 0,
      gained: 0,
      wrong: [],
      masteryUpdates: {},
    })
    setEarnedBadges([])
    setScreen('quiz')
  }

  function exitQuiz() {
    if (window.confirm('지금 나가면 이번 풀이는 저장되지 않아요. 마을로 돌아갈까요?')) {
      setSession(null)
      setScreen('town')
    }
  }

  function upgradeHouse() {
    const cost = nextHouseCost(profile.houseStage)
    if (cost == null || profile.coins < cost) return
    persist({ ...profile, coins: profile.coins - cost, houseStage: profile.houseStage + 1 })
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

    const masteryUpdates: MasteryMap = {
      ...session.masteryUpdates,
      [problem.id]: updateEntry(
        session.masteryUpdates[problem.id] ?? profile.mastery[problem.id],
        r.correct,
        { subject: problem.subject, unit: problem.unit },
      ),
    }

    const next: SessionState = {
      ...session,
      combo,
      bestCombo: Math.max(session.bestCombo, combo),
      correct: session.correct + (r.correct ? 1 : 0),
      gained: session.gained + gained,
      wrong,
      masteryUpdates,
      i: session.i + 1,
    }

    if (next.i >= next.problems.length) {
      await finishSession(next)
    } else {
      setSession(next)
    }
  }

  // 세션 결과를 프로필에 반영 (일반/게임 공용)
  function applyResult(s: SessionState): { updated: PlayerProfile; fresh: Badge[] } {
    const score = Math.round((s.correct / s.problems.length) * 100)
    const villagerFriends = { ...profile.villagerFriends }
    if (s.villagerId) {
      villagerFriends[s.villagerId] = (villagerFriends[s.villagerId] ?? 0) + s.correct * 4 + 4
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
      mastery: { ...profile.mastery, ...s.masteryUpdates },
      daily: {
        ...profile.daily,
        solved: profile.daily.solved + s.problems.length,
        bestCombo: Math.max(profile.daily.bestCombo, s.bestCombo),
      },
    }
    // 단원 완성 보상: 새로 '완성'된 단원마다 보너스 벨
    const claimed = new Set(profile.dexRewards)
    const newlyDone = completedUnitKeys(updated.mastery).filter((k) => !claimed.has(k))
    if (newlyDone.length) {
      updated.coins += newlyDone.length * UNIT_REWARD
      updated.dexRewards = [...profile.dexRewards, ...newlyDone]
    }
    const fresh = newlyEarnedBadges({
      profile: updated,
      sessionCorrect: s.correct,
      sessionTotal: s.problems.length,
      sessionBestCombo: s.bestCombo,
      perfect: s.correct === s.problems.length,
    })
    updated.badges = [...updated.badges, ...fresh.map((b) => b.id)]
    return { updated, fresh }
  }

  async function finishSession(s: SessionState) {
    const { updated, fresh } = applyResult(s)
    setProfile(updated)
    setEarnedBadges(fresh)
    await store.saveProfile(updated)
    store.syncProfile?.(updated).catch(() => {})
    setWrongNotes(await store.loadWrongNotes())
    setSession(s)
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

  // ── 게임(Phaser) 연동: 월드를 유지한 채 퀴즈를 오버레이로 ──
  function startGameQuiz(problems: Problem[], villager?: Villager, plotId?: string) {
    if (!problems || !problems.length) return
    setGameSession({
      problems: prepareProblems(problems, 'study', profile.mastery),
      mode: 'study',
      villagerId: villager?.id,
      villagerName: villager?.name,
      i: 0,
      combo: 0,
      bestCombo: 0,
      correct: 0,
      gained: 0,
      wrong: [],
      masteryUpdates: {},
      fromGame: true,
      plotId,
    })
  }

  async function handleGameSubmit(r: { correct: boolean; responses: string[]; timeLeftRatio: number }) {
    if (!gameSession) return
    const problem = gameSession.problems[gameSession.i]
    const combo = r.correct ? gameSession.combo + 1 : 0
    const gained = r.correct
      ? computeScore({ basePoints: problem.points, combo, timeLeftRatio: r.timeLeftRatio })
      : 0
    const wrong = [...gameSession.wrong]
    if (!r.correct) {
      const note: WrongNote = { problem, userResponses: r.responses, wrongAt: Date.now(), resolved: false }
      wrong.push(note)
      await store.upsertWrongNote(note)
    } else {
      await store.markResolved(problem.id)
    }
    const masteryUpdates: MasteryMap = {
      ...gameSession.masteryUpdates,
      [problem.id]: updateEntry(gameSession.masteryUpdates[problem.id] ?? profile.mastery[problem.id], r.correct, {
        subject: problem.subject,
        unit: problem.unit,
      }),
    }
    const next: SessionState = {
      ...gameSession,
      combo,
      bestCombo: Math.max(gameSession.bestCombo, combo),
      correct: gameSession.correct + (r.correct ? 1 : 0),
      gained: gameSession.gained + gained,
      wrong,
      masteryUpdates,
      i: gameSession.i + 1,
    }
    if (next.i >= next.problems.length) {
      const { updated } = applyResult(next)
      setProfile(updated)
      await store.saveProfile(updated)
      store.syncProfile?.(updated).catch(() => {})
      setWrongNotes(await store.loadWrongNotes())
      if (next.plotId) {
        const success = next.correct / next.problems.length >= 0.5
        if (success) addCarrots(next.correct)
        bridge.emit('react:reward', { plotId: next.plotId, correct: next.correct, total: next.problems.length })
      }
      setGameSession(null) // 게임 월드로 복귀 (캔버스 유지)
    } else {
      setGameSession(next)
    }
  }

  // 브리지 핸들러는 항상 최신 상태를 보도록 ref 로 보관
  bridgeRef.current = {
    ui: (d) => setScreen(d.type),
    villager: (d) => {
      const v = villagerById(d.id)
      if (v) startGameQuiz(VILLAGER_PROBLEMS[v.id], v)
    },
    harvest: (d) => {
      const v = villagerById(d.subject)
      startGameQuiz(VILLAGER_PROBLEMS[d.subject], v, d.plotId)
    },
  }

  useEffect(() => {
    const ui = (d: { type: FacilityScreen }) => bridgeRef.current?.ui(d)
    const villager = (d: { id: string }) => bridgeRef.current?.villager(d)
    const harvest = (d: { plotId: string; subject: string }) => bridgeRef.current?.harvest(d)
    bridge.on('phaser:ui', ui)
    bridge.on('phaser:villager', villager)
    bridge.on('phaser:harvest', harvest)
    return () => {
      bridge.off('phaser:ui', ui)
      bridge.off('phaser:villager', villager)
      bridge.off('phaser:harvest', harvest)
    }
  }, [])

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

  function go(s: Screen) {
    setMenuOpen(false)
    setGameSession(null)
    setScreen(s)
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
        onMenu={() => setMenuOpen(true)}
      />

      {menuOpen && <MainMenu onGo={go} onClose={() => setMenuOpen(false)} />}

      {screen === 'dashboard' && (
        <Dashboard profile={profile} level={level} cur={cur} need={need} onGo={go} />
      )}

      {screen === 'town' && (
        <TownMap
          avatar={profile.avatar}
          hat={cosmeticById(profile.equipped)?.emoji}
          characterName={profile.characterName}
          houseStage={profile.houseStage}
          mates={classmates.filter((c) => !c.me)}
          stars={
            profile.correctCount +
            Math.round(classmates.reduce((s, c) => s + (c.me ? 0 : c.xp), 0) / 40)
          }
          onStudy={talkAndStudy}
          onMake={makeForVillager}
          onOpen={(s: FacilityScreen) => setScreen(s)}
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
          onExit={exitQuiz}
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

      {screen === 'game' && (
        <>
          <PhaserGame
            avatar={profile.avatar}
            coins={profile.coins}
            carrots={getCarrots()}
            onExit={() => {
              setGameSession(null)
              setScreen('town')
            }}
          />
          {gameSession && (
            <div className="game-quiz-overlay">
              <QuestionCard
                key={gameSession.problems[gameSession.i].id}
                problem={gameSession.problems[gameSession.i]}
                index={gameSession.i}
                total={gameSession.problems.length}
                combo={gameSession.combo}
                mode={gameSession.mode}
                onSubmit={handleGameSubmit}
                onExit={() => setGameSession(null)}
              />
            </div>
          )}
        </>
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
          onUpgrade={upgradeHouse}
          onShop={() => setScreen('shop')}
          onGame={() => setScreen('game')}
          onDex={() => setScreen('dex')}
          onBack={() => setScreen('town')}
        />
      )}

      {screen === 'dex' && <Dex profile={profile} onBack={() => setScreen('town')} />}

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
  onMenu: () => void
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
      <button className="menu-btn" onClick={props.onMenu} title="메뉴" aria-label="메뉴">
        ☰
      </button>
    </header>
  )
}

// ── 메뉴 (어디서든 빠른 이동 = 대시보드 허브) ─────────────────────
function MainMenu(props: { onGo: (s: Screen) => void; onClose: () => void }) {
  const items: { s: Screen; emoji: string; label: string }[] = [
    { s: 'dashboard', emoji: '📊', label: '학습 현황' },
    { s: 'town', emoji: '🗺️', label: '마을' },
    { s: 'game', emoji: '🎮', label: '필드 (픽셀)' },
    { s: 'dex', emoji: '📜', label: '학습 도감' },
    { s: 'wrong', emoji: '📒', label: '오답노트' },
    { s: 'ai', emoji: '🤖', label: '문제공방' },
    { s: 'shop', emoji: '🛍️', label: '상점' },
    { s: 'missions', emoji: '🎯', label: '미션' },
    { s: 'ranking', emoji: '🏆', label: '랭킹' },
    { s: 'room', emoji: '🏠', label: '내 집' },
  ]
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="menu-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="menu-grid">
          {items.map((it) => (
            <button key={it.s} className="menu-item" onClick={() => props.onGo(it.s)}>
              <span className="menu-emoji">{it.emoji}</span>
              <span className="menu-label">{it.label}</span>
            </button>
          ))}
        </div>
        <button className="btn ghost big" onClick={props.onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}

// ── 학습 현황 대시보드 ────────────────────────────────────────────
function Dashboard(props: {
  profile: PlayerProfile
  level: number
  cur: number
  need: number
  onGo: (s: Screen) => void
}) {
  const p = props.profile
  const subjects = subjectStats(p.mastery)
  const accuracy = p.solvedCount ? Math.round((p.correctCount / p.solvedCount) * 100) : 0
  const wonTrophies = trophies(p, p.mastery).filter((t) => t.earned).length
  const totalTrophies = trophies(p, p.mastery).length
  const friends = Object.values(p.villagerFriends).filter((v) => v > 0).length

  return (
    <main className="screen dashboard">
      <h1 className="title">📊 {p.characterName}의 학습 현황</h1>
      <p className="subtitle">
        {titleForLevel(props.level)} · Lv.{props.level} ({props.cur}/{props.need} XP)
      </p>

      <div className="stat-grid">
        <Stat emoji="🔥" label="최고 콤보" value={`${p.bestCombo}`} />
        <Stat emoji="🎯" label="정답률" value={`${accuracy}%`} />
        <Stat emoji="✅" label="누적 정답" value={`${p.correctCount}`} />
        <Stat emoji="📚" label="푼 문제" value={`${p.solvedCount}`} />
        <Stat emoji="🏆" label="전시품" value={`${wonTrophies}/${totalTrophies}`} />
        <Stat emoji="🏠" label="집 단계" value={`${p.houseStage + 1}`} />
        <Stat emoji="❤️" label="친한 주민" value={`${friends}`} />
        <Stat emoji="🔔" label="벨" value={`${p.coins}`} />
      </div>

      <h3 className="section-label">오늘</h3>
      <div className="today-row">
        <Stat emoji="📝" label="오늘 푼 문제" value={`${p.daily.solved}`} />
        <Stat emoji="🔥" label="오늘 최고 콤보" value={`${p.daily.bestCombo}`} />
      </div>

      <h3 className="section-label">과목 숙련도</h3>
      {subjects.length === 0 ? (
        <p className="empty">아직 기록이 없어요. 마을에서 주민과 공부해 보세요!</p>
      ) : (
        <div className="dex-subjects">
          {subjects.map((s) => {
            const pct = s.seen ? Math.round((s.mastered / s.seen) * 100) : 0
            return (
              <div key={s.subject} className="dex-subject">
                <span className="dex-emoji">{s.emoji}</span>
                <div className="dex-sub-body">
                  <div className="dex-sub-top">
                    <b>{s.subject}</b>
                    <span className="dex-sub-num">익힘 {s.mastered} / {s.seen}</span>
                  </div>
                  <div className="mission-bar">
                    <div className="mission-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button className="btn primary big" onClick={() => props.onGo('town')}>
        🗺️ 마을에서 공부하기
      </button>
      <button className="btn ghost big" onClick={() => props.onGo('dex')}>
        📜 학습 도감 보기
      </button>
    </main>
  )
}

function Stat(props: { emoji: string; label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-emoji">{props.emoji}</span>
      <span className="stat-value">{props.value}</span>
      <span className="stat-label">{props.label}</span>
    </div>
  )
}

// ── 내 집 (정체성/꾸미기) ─────────────────────────────────────────
function Room(props: {
  profile: PlayerProfile
  level: number
  onAvatar: (a: string) => void
  onRename: (n: string) => void
  onUpgrade: () => void
  onShop: () => void
  onGame: () => void
  onDex: () => void
  onBack: () => void
}) {
  const { profile } = props
  const [name, setName] = useState(profile.characterName)
  const placed = profile.furniture.map(furnitureById).filter(Boolean) as Furniture[]
  const hat = cosmeticById(profile.equipped)?.emoji
  const house = houseInfo(profile.houseStage)
  const nextCost = nextHouseCost(profile.houseStage)
  const canUpgrade = nextCost != null && profile.coins >= nextCost
  const wonTrophies = trophies(profile, profile.mastery).filter((t) => t.earned)

  return (
    <main className="screen room">
      <h1 className="title">🏠 {profile.characterName}의 집</h1>

      <div className="room-stage">
        <div className="house-big">{house.emoji}</div>
        {wonTrophies.length > 0 && (
          <div className="trophy-shelf" title="학습 전시품">
            {wonTrophies.map((t) => (
              <span key={t.id} className="shelf-item" title={t.name}>
                {t.emoji}
              </span>
            ))}
          </div>
        )}
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

      {/* 집 짓기: 문제로 모은 벨로 단계 올리기 */}
      <div className="build-box">
        <div className="build-info">
          <b>
            {house.emoji} {house.name}
          </b>
          <span className="build-stage">
            {profile.houseStage + 1} / {HOUSE_STAGES.length} 단계
          </span>
        </div>
        {nextCost == null ? (
          <span className="build-max">최고 단계 달성! 🎉</span>
        ) : (
          <button className="btn primary build-btn" disabled={!canUpgrade} onClick={props.onUpgrade}>
            🔨 다음 단계로 짓기 · 🔔 {nextCost}
          </button>
        )}
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

      <button className="btn primary big" onClick={props.onDex}>
        📜 학습 도감 보기
      </button>
      <button className="btn accent big" onClick={props.onShop}>
        🛍️ 옷·가구 사러 가기
      </button>
      <button className="btn challenge big" onClick={props.onGame}>
        🎮 픽셀 마을 (게임엔진 베타) 입장
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

// ── 학습 도감 ─────────────────────────────────────────────────────
function Dex(props: { profile: PlayerProfile; onBack: () => void }) {
  const subjects = subjectStats(props.profile.mastery)
  const units = unitCards(props.profile.mastery)
  const tlist = trophies(props.profile, props.profile.mastery)
  const earnedCount = tlist.filter((t) => t.earned).length

  return (
    <main className="screen dex">
      <h1 className="title">📜 학습 도감</h1>
      <p className="subtitle">공부할수록 채워져요 · 전시품 {earnedCount}/{tlist.length}</p>

      <h3 className="section-label">과목</h3>
      {subjects.length === 0 ? (
        <p className="empty">아직 비어 있어요. 주민과 공부하면 채워집니다!</p>
      ) : (
        <div className="dex-subjects">
          {subjects.map((s) => {
            const pct = s.seen ? Math.round((s.mastered / s.seen) * 100) : 0
            return (
              <div key={s.subject} className="dex-subject">
                <span className="dex-emoji">{s.emoji}</span>
                <div className="dex-sub-body">
                  <div className="dex-sub-top">
                    <b>{s.subject}</b>
                    <span className="dex-sub-num">익힘 {s.mastered} / {s.seen}</span>
                  </div>
                  <div className="mission-bar">
                    <div className="mission-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <h3 className="section-label">단원 수집</h3>
      {units.length === 0 ? (
        <p className="empty">아직 모은 단원이 없어요.</p>
      ) : (
        <div className="dex-units">
          {units.map((u) => (
            <div key={u.subject + u.unit} className={`unit-card ${u.done ? 'done' : ''}`}>
              <span className="unit-stamp">{u.done ? '✅' : '📖'}</span>
              <span className="unit-name">{u.unit}</span>
              <span className="unit-sub">{u.subject} · {u.mastered}/{u.seen}</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="section-label">전시품 (내 집에 진열돼요)</h3>
      <div className="trophy-grid">
        {tlist.map((t) => (
          <div key={t.id} className={`trophy ${t.earned ? 'earned' : 'locked'}`} title={t.desc}>
            <span className="trophy-emoji">{t.earned ? t.emoji : '🔒'}</span>
            <span className="trophy-name">{t.name}</span>
          </div>
        ))}
      </div>

      <button className="btn ghost big" onClick={props.onBack}>
        마을로
      </button>
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
