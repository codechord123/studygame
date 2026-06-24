import { useEffect, useMemo, useRef, useState } from 'react'
import { QuestionCard, type PlayMode } from './components/QuestionCard'
import { SpeedOxGame, type GameResult } from './components/SpeedOxGame'
import { MemoryGame } from './components/MemoryGame'
import { SortGame } from './components/SortGame'
import { BossGame } from './components/BossGame'
import { SequenceGame } from './components/SequenceGame'
import { TownMap, type FacilityScreen } from './components/TownMap'
import { AiMaker } from './components/AiMaker'
import { ProblemCreate, type EditTarget } from './components/ProblemCreate'
import { AnimalCharacter } from './components/AnimalCharacter'
import { PhaserGame } from './react/game/PhaserGame'
import { bridge } from './game/bridge'
import { store, type WrongNote } from './lib/storage'
import { playWin, isMuted, setMuted, playLevelUp, playBadge } from './lib/sfx'
import { makeBackup, restoreBackup, inspectBackup } from './lib/backup'
import { makeContentPack, importPack, inspectPack } from './lib/contentShare'
import { firebaseEnabled } from './lib/firebase/config'
import {
  type PlayerProfile,
  emptyProfile,
  normalizeProfile,
  levelProgress,
  levelFromXp,
  petForLevel,
  type PetStage,
  comboMultiplier,
  computeScore,
  newlyEarnedBadges,
  bumpStreak,
  todayStr,
  DAILY_GOAL,
  DAILY_GOAL_COINS,
  DAILY_GOAL_XP,
  type Badge,
} from './game/gamification'
import {
  DAILY_MISSIONS,
  missionProgress,
  missionClaimable,
  leaderboard,
  type RankEntry,
} from './game/progression'
import {
  SLOTS,
  COSTUMES,
  itemsForSlot,
  isUnlocked,
  equippedEmoji,
  type Slot,
  type CostumeItem,
} from './game/costume'
import { MINIGAMES, miniGameById, pickForGame, type MiniGame } from './game/minigames'
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
  VILLAGERS,
  villagerById,
  friendHearts,
  type Villager,
  type Furniture,
  type Classmate,
} from './game/world'
import { orderByMastery, updateEntry, type MasteryMap } from './game/mastery'
import { subjectStats, unitCards, trophies, completedUnitKeys, UNIT_REWARD } from './game/collection'
import { VILLAGER_PROBLEMS } from './data/villagerQuizzes'
import { type Unit } from './data/curriculum'
import {
  loadCustom,
  addCustomProblem,
  updateCustomProblem,
  deleteCustomProblem,
  flattenCustom,
  mergedUnitsFor,
  type CustomStore,
  type CustomItem,
} from './data/customContent'
import type { Problem } from './types/problem'

// 과목별 테마 클래스 (광장→대화창→단원→퀴즈 시각 통일)
const SUBJECT_THEME: Record<string, string> = {
  수학: 'theme-math',
  국어: 'theme-korean',
  사회: 'theme-social',
  과학: 'theme-science',
}
function themeOf(subject?: string): string {
  return (subject && SUBJECT_THEME[subject]) || 'theme-math'
}

type Screen =
  | 'home'
  | 'subjects'
  | 'units'
  | 'minigame'
  | 'costume'
  | 'create'
  | 'walk'
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
  | 'settings'
  | 'manage'
  | 'teacher'

function hatOf(p: PlayerProfile): string | undefined {
  return equippedEmoji(p.equip, 'hat')
}

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
  miniGameId?: string // 선택한 미니게임 (battle 연출 등)
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
  const [screen, setScreen] = useState<Screen>('home')
  const [profile, setProfile] = useState<PlayerProfile>(emptyProfile)
  const [session, setSession] = useState<SessionState | null>(null)
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([])
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([])
  const [levelUp, setLevelUp] = useState<{ level: number; pet: PetStage | null } | null>(null)
  const [aiVillager, setAiVillager] = useState<Villager | null>(null)
  const [classmates, setClassmates] = useState<Classmate[]>(CLASSMATES)
  const [gameSession, setGameSession] = useState<SessionState | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unitVillager, setUnitVillager] = useState<Villager | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [customStore, setCustomStore] = useState<CustomStore>({})
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
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
    setCustomStore(loadCustom())
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

  function buyCostume(c: CostumeItem, level: number) {
    if (profile.coins < c.price || profile.cosmetics.includes(c.id) || !isUnlocked(c, level)) return
    persist({
      ...profile,
      coins: profile.coins - c.price,
      cosmetics: [...profile.cosmetics, c.id],
      equip: { ...profile.equip, [c.slot]: c.id },
    })
  }
  function equipCostume(slot: Slot, id: string | null) {
    const equip = { ...profile.equip }
    if (id) equip[slot] = id
    else delete equip[slot]
    persist({ ...profile, equip })
  }
  function setEquipAll(equip: Record<string, string>) {
    persist({ ...profile, equip })
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

  function startQuiz(problems: Problem[], mode: PlayMode, villager?: Villager, miniGameId?: string) {
    setSession({
      problems: prepareProblems(problems, mode, profile.mastery),
      mode,
      villagerId: villager?.id,
      villagerName: villager?.name,
      miniGameId,
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
  function chooseUnit(u: Unit) {
    setSelectedUnit(u)
    setScreen('minigame')
  }
  function startMiniGame(g: MiniGame) {
    if (!selectedUnit) return
    const picked = pickForGame(g, selectedUnit.problems)
    startQuiz(picked, g.mode, unitVillager ?? undefined, g.id)
  }

  function exitQuiz() {
    if (window.confirm('지금 나가면 이번 풀이는 저장되지 않아요. 마을로 돌아갈까요?')) {
      setSession(null)
      setScreen('home')
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
    // 한 세트 만점 누적
    if (s.problems.length > 0 && s.correct === s.problems.length) {
      updated.perfectCount = profile.perfectCount + 1
    }
    // 연속 출석(스트릭) — 오늘 처음 풀었으면 갱신
    const today = todayStr()
    const st = bumpStreak(profile, today)
    updated.streak = st.streak
    updated.streakBest = st.streakBest
    updated.lastActiveDate = st.lastActiveDate
    // 오늘의 목표 달성 보너스 (하루 1회)
    if (!updated.daily.goalClaimed && updated.daily.solved >= DAILY_GOAL) {
      updated.daily = { ...updated.daily, goalClaimed: true }
      updated.coins += DAILY_GOAL_COINS
      updated.xp += DAILY_GOAL_XP
      updated.dailyGoalCount = profile.dailyGoalCount + 1
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
    const prevLevel = levelFromXp(profile.xp)
    const { updated, fresh } = applyResult(s)
    const newLevel = levelFromXp(updated.xp)
    if (newLevel > prevLevel) {
      const evolved = petForLevel(prevLevel).emoji !== petForLevel(newLevel).emoji
      setLevelUp({ level: newLevel, pet: evolved ? petForLevel(newLevel) : null })
      playLevelUp()
    } else if (fresh.length) {
      playBadge()
    }
    setProfile(updated)
    setEarnedBadges(fresh)
    await store.saveProfile(updated)
    store.syncProfile?.(updated).catch(() => {})
    setWrongNotes(await store.loadWrongNotes())
    setSession(s)
    setScreen('result')
  }

  // 미니게임(OX·메모리) 결과 → 기존 보상/숙련도 파이프라인으로 마감
  async function finishFromResults(
    problems: Problem[],
    results: GameResult[],
    villager?: Villager,
    miniGameId?: string,
  ) {
    let combo = 0
    let bestCombo = 0
    let correct = 0
    let gained = 0
    const masteryUpdates: MasteryMap = {}
    const wrong: WrongNote[] = []
    for (const r of results) {
      const p = problems.find((x) => x.id === r.id)
      if (!p) continue
      if (r.correct) {
        combo += 1
        bestCombo = Math.max(bestCombo, combo)
        correct += 1
        gained += computeScore({ basePoints: p.points, combo })
        await store.markResolved(p.id)
      } else {
        combo = 0
        const note: WrongNote = { problem: p, userResponses: [], wrongAt: Date.now(), resolved: false }
        wrong.push(note)
        await store.upsertWrongNote(note)
      }
      masteryUpdates[p.id] = updateEntry(masteryUpdates[p.id] ?? profile.mastery[p.id], r.correct, {
        subject: p.subject,
        unit: p.unit,
      })
    }
    // 실제로 응답한 문제만 결과에 반영 (분류/보스의 조기 종료·부분 풀이 대비)
    const answeredIds = new Set(results.map((r) => r.id))
    const played = problems.filter((p) => answeredIds.has(p.id))
    await finishSession({
      problems: played.length ? played : problems,
      mode: 'challenge',
      villagerId: villager?.id,
      villagerName: villager?.name,
      miniGameId,
      i: played.length || problems.length,
      combo,
      bestCombo,
      correct,
      gained,
      wrong,
      masteryUpdates,
    })
  }

  function talkAndStudy(v: Villager, mode: PlayMode) {
    const problems = VILLAGER_PROBLEMS[v.id]
    if (problems && problems.length) startQuiz(problems, mode, v)
  }
  function openUnits(v: Villager) {
    setUnitVillager(v)
    setScreen('units')
  }
  function unitsForVillager(v: Villager): Unit[] {
    return mergedUnitsFor(v.id, v.subject, customStore)
  }
  function saveProblem(villagerId: string, unitName: string, problem: Problem) {
    setCustomStore((s) => addCustomProblem(s, villagerId, unitName, problem))
  }
  function updateProblem(villagerId: string, unitName: string, problem: Problem) {
    setCustomStore((s) => updateCustomProblem(s, villagerId, unitName, problem))
  }
  function deleteProblem(item: CustomItem) {
    setCustomStore((s) => deleteCustomProblem(s, item.villagerId, item.unitName, item.problem.id))
  }
  function startEdit(item: CustomItem) {
    setEditTarget({ villagerId: item.villagerId, unitName: item.unitName, problem: item.problem })
    setScreen('create')
  }
  // 아이들이 직접 문제를 만드는 경로(과목 미리 지정)
  function openCreate(v?: Villager) {
    setEditTarget(null)
    if (v) setUnitVillager(v)
    setScreen('create')
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
      {levelUp && <LevelUpToast info={levelUp} onClose={() => setLevelUp(null)} />}
      <Hud
        avatar={profile.avatar}
        name={profile.characterName}
        title={titleForLevel(level)}
        level={level}
        cur={cur}
        need={need}
        coins={profile.coins}
        cosmetic={hatOf(profile)}
        onProfile={() => setScreen('costume')}
        onMenu={() => setMenuOpen(true)}
      />

      {menuOpen && <MainMenu onGo={go} onClose={() => setMenuOpen(false)} />}

      {screen === 'home' && (
        <Home profile={profile} level={level} onGo={go} />
      )}

      {screen === 'costume' && (
        <Costume
          profile={profile}
          level={level}
          onBuy={(c) => buyCostume(c, level)}
          onEquip={equipCostume}
          onSetEquip={setEquipAll}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'dashboard' && (
        <Dashboard profile={profile} level={level} cur={cur} need={need} onGo={go} />
      )}

      {screen === 'subjects' && (
        <Plaza
          profile={profile}
          onUnits={openUnits}
          onCreate={openCreate}
          onGo={go}
        />
      )}

      {screen === 'units' && unitVillager && (
        <UnitSelect
          villager={unitVillager}
          units={unitsForVillager(unitVillager)}
          profile={profile}
          onChoose={chooseUnit}
          onCreate={() => setScreen('create')}
          onBack={() => setScreen('subjects')}
        />
      )}

      {screen === 'create' && (
        <ProblemCreate
          store={customStore}
          initialVillager={unitVillager}
          editing={editTarget}
          onSave={saveProblem}
          onUpdate={updateProblem}
          onBack={() => {
            const wasEditing = !!editTarget
            setEditTarget(null)
            setScreen(wasEditing ? 'manage' : unitVillager ? 'units' : 'subjects')
          }}
        />
      )}

      {screen === 'manage' && (
        <Manage
          items={flattenCustom(customStore)}
          onEdit={startEdit}
          onDelete={deleteProblem}
          onNew={() => openCreate()}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'minigame' && selectedUnit && (
        <MiniGameSelect
          unit={selectedUnit}
          subject={unitVillager?.subject}
          onPick={startMiniGame}
          onBack={() => setScreen('units')}
        />
      )}

      {screen === 'walk' && (
        <TownMap
          avatar={profile.avatar}
          hat={hatOf(profile)}
          characterName={profile.characterName}
          houseStage={profile.houseStage}
          mates={classmates.filter((c) => !c.me)}
          stars={
            profile.correctCount +
            Math.round(classmates.reduce((s, c) => s + (c.me ? 0 : c.xp), 0) / 40)
          }
          onStudy={talkAndStudy}
          onMake={openCreate}
          onOpen={(s: FacilityScreen) => setScreen(s)}
        />
      )}

      {screen === 'quiz' && session && (() => {
        const kind = miniGameById(session.miniGameId ?? '')?.kind ?? 'card'
        const theme = themeOf(session.problems[session.i]?.subject)
        const villager = session.villagerId ? villagerById(session.villagerId) : undefined
        if (kind === 'ox') {
          return (
            <SpeedOxGame
              problems={session.problems}
              theme={theme}
              avatar={profile.avatar}
              onComplete={(res) => finishFromResults(session.problems, res, villager, session.miniGameId)}
              onExit={exitQuiz}
            />
          )
        }
        if (kind === 'memory') {
          return (
            <MemoryGame
              problems={session.problems}
              theme={theme}
              onComplete={(res) => finishFromResults(session.problems, res, villager, session.miniGameId)}
              onExit={exitQuiz}
            />
          )
        }
        if (kind === 'sort') {
          return (
            <SortGame
              problems={session.problems}
              theme={theme}
              onComplete={(res) => finishFromResults(session.problems, res, villager, session.miniGameId)}
              onExit={exitQuiz}
            />
          )
        }
        if (kind === 'boss') {
          return (
            <BossGame
              problems={session.problems}
              theme={theme}
              avatar={profile.avatar}
              onComplete={(res) => finishFromResults(session.problems, res, villager, session.miniGameId)}
              onExit={exitQuiz}
            />
          )
        }
        if (kind === 'sequence') {
          return (
            <SequenceGame
              problems={session.problems}
              theme={theme}
              onComplete={(res) => finishFromResults(session.problems, res, villager, session.miniGameId)}
              onExit={exitQuiz}
            />
          )
        }
        return (
          <div className="play-wrap">
            {session.miniGameId === 'battle' && (
              <BattleBar correct={session.correct} total={session.problems.length} />
            )}
            <QuestionCard
              key={session.problems[session.i].id}
              problem={session.problems[session.i]}
              index={session.i}
              total={session.problems.length}
              combo={session.combo}
              mode={session.mode}
              theme={theme}
              autoAdvance={session.miniGameId !== 'fill'}
              onSubmit={handleSubmit}
              onExit={exitQuiz}
            />
          </div>
        )
      })()}

      {screen === 'result' && session && (
        <Result
          session={session}
          earned={earnedBadges}
          friends={profile.villagerFriends}
          onHome={() => setScreen('home')}
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
              setScreen('home')
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
                theme={themeOf(gameSession.problems[gameSession.i].subject)}
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
            setScreen('home')
          }}
          onUse={(problems) => {
            const v = aiVillager ?? undefined
            setAiVillager(null)
            startQuiz(problems, 'study', v)
          }}
        />
      )}

      {screen === 'shop' && (
        <Shop profile={profile} onBuyFurniture={buyFurniture} onBack={() => setScreen('room')} />
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
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'dex' && <Dex profile={profile} onBack={() => setScreen('home')} />}

      {screen === 'settings' && <Settings onBack={() => setScreen('home')} />}

      {screen === 'teacher' && (
        <Teacher
          items={flattenCustom(customStore)}
          store={customStore}
          onImport={(s) => setCustomStore(s)}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'missions' && (
        <Missions profile={profile} onClaim={claimMission} onBack={() => setScreen('home')} />
      )}

      {screen === 'ranking' && (
        <Ranking profile={profile} onRename={renameCharacter} onBack={() => setScreen('home')} />
      )}

      {screen === 'wrong' && (
        <WrongBook
          notes={wrongNotes}
          onBack={() => setScreen('home')}
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
          <div className="story-emoji">{['🚂', '🌌', '🏡', '💬', '🎯', '✨'][step] ?? '✨'}</div>
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
                <AnimalCharacter avatar={a} equip={{}} className="avatar-thumb" />
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

// ── 마을 광장 (기본 화면) : 과목 NPC 중심의 깔끔한 학습 허브 ──────
function Plaza(props: {
  profile: PlayerProfile
  onUnits: (v: Villager) => void
  onCreate: (v: Villager) => void
  onGo: (s: Screen) => void
}) {
  const [active, setActive] = useState<Villager | null>(null)
  const stats = subjectStats(props.profile.mastery)
  const masteredOf = (subject: string) => stats.find((s) => s.subject === subject)?.mastered ?? 0
  const seenOf = (subject: string) => stats.find((s) => s.subject === subject)?.seen ?? 0

  return (
    <main className="screen plaza">
      <div className="plaza-hero">
        <span className="plaza-avatar">{props.profile.avatar}</span>
        <div>
          <h1 className="plaza-hi">안녕, {props.profile.characterName}!</h1>
          <p className="plaza-sub">오늘은 어떤 친구와 공부할까요?</p>
        </div>
      </div>

      <div className="subject-cards">
        {VILLAGERS.map((v) => {
          const hearts = friendHearts(props.profile.villagerFriends[v.id] ?? 0)
          const seen = seenOf(v.subject)
          return (
            <button
              key={v.id}
              className={`subject-card ${SUBJECT_THEME[v.subject] ?? ''}`}
              onClick={() => setActive(v)}
            >
              <span className="sc-emoji">{v.emoji}</span>
              <span className="sc-subject">{v.subject}</span>
              <span className="sc-name">{v.name}</span>
              <span className="sc-meta">
                {hearts > 0 ? '❤️'.repeat(hearts) : '🤍'} · 익힘 {masteredOf(v.subject)}/{seen || 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="plaza-quick">
        <button className="quick-btn" onClick={() => props.onGo('home')}>
          🏠 홈
        </button>
        <button className="quick-btn" onClick={() => props.onGo('dashboard')}>
          📊 학습 현황
        </button>
        <button className="quick-btn" onClick={() => props.onGo('dex')}>
          📜 도감
        </button>
      </div>

      {active && (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <div
            className={`npc-dialog ${SUBJECT_THEME[active.subject] ?? ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="npc-portrait">{active.emoji}</div>
            <div className="npc-head">
              <b>{active.name}</b>
              <span className="npc-tag">{active.subject} 선생님</span>
            </div>
            <p className="npc-speech">
              “
              {friendHearts(props.profile.villagerFriends[active.id] ?? 0) >= 3
                ? active.bond
                : active.greeting}
              ”
            </p>
            <div className="npc-actions">
              <button
                className="btn primary big"
                onClick={() => {
                  const v = active
                  setActive(null)
                  props.onUnits(v)
                }}
              >
                📚 단원 고르기
              </button>
              <button
                className="btn ghost big"
                onClick={() => {
                  const v = active
                  setActive(null)
                  props.onCreate(v)
                }}
              >
                ✏️ 직접 문제 만들기
              </button>
            </div>
            <button className="dialog-close" onClick={() => setActive(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

// ── 홈 (두 파트: 공부하기 / 꾸미기) ───────────────────────────────
function Home(props: { profile: PlayerProfile; level: number; onGo: (s: Screen) => void }) {
  const { profile } = props
  const goalPct = Math.min(100, Math.round((profile.daily.solved / DAILY_GOAL) * 100))
  const goalDone = profile.daily.solved >= DAILY_GOAL
  return (
    <main className="screen home2">
      <div className="home-hello">
        <AnimalCharacter avatar={props.profile.avatar} equip={props.profile.equip} className="home-char" />
        <div>
          <h1 className="home-name">{props.profile.characterName}</h1>
          <p className="home-title">{titleForLevel(props.level)} · Lv.{props.level}</p>
        </div>
        {profile.streak > 0 && (
          <span className="streak-chip" title={`최고 ${profile.streakBest}일 연속`}>
            🔥 {profile.streak}일
          </span>
        )}
      </div>

      <button className="daily-card" onClick={() => props.onGo('subjects')}>
        <div className="daily-top">
          <span className="daily-title">🎯 오늘의 목표</span>
          <span className="daily-count">
            {Math.min(profile.daily.solved, DAILY_GOAL)} / {DAILY_GOAL}
          </span>
        </div>
        <div className="daily-bar">
          <div className={`daily-fill ${goalDone ? 'done' : ''}`} style={{ width: `${goalPct}%` }} />
        </div>
        <span className="daily-sub">
          {goalDone ? '✅ 오늘 목표 달성! 잘했어요' : `${DAILY_GOAL - profile.daily.solved}문제 더 풀면 보너스 🔔${DAILY_GOAL_COINS}`}
        </span>
      </button>

      <div className="pillars">
        <button className="pillar pillar-study" onClick={() => props.onGo('subjects')}>
          <span className="pillar-emoji">📚</span>
          <span className="pillar-name">공부하기</span>
          <span className="pillar-desc">과목 · 단원 · 미니게임</span>
        </button>
        <button className="pillar pillar-dress" onClick={() => props.onGo('costume')}>
          <span className="pillar-emoji">👕</span>
          <span className="pillar-name">꾸미기</span>
          <span className="pillar-desc">코스튬 · 레벨로 해금</span>
        </button>
      </div>

      <div className="plaza-quick">
        <button className="quick-btn" onClick={() => props.onGo('dashboard')}>📊 학습 현황</button>
        <button className="quick-btn" onClick={() => props.onGo('dex')}>📜 도감</button>
        <button className="quick-btn" onClick={() => props.onGo('room')}>🏠 내 집</button>
      </div>
    </main>
  )
}

// ── 꾸미기 (캐릭터 코스튬) ────────────────────────────────────────
const OUTFIT_KEY = 'sg.outfits'
function loadOutfits(): Record<string, string>[] {
  try {
    return JSON.parse(localStorage.getItem(OUTFIT_KEY) || '[]')
  } catch {
    return []
  }
}
function saveOutfits(o: Record<string, string>[]) {
  localStorage.setItem(OUTFIT_KEY, JSON.stringify(o.slice(0, 3)))
}

function Costume(props: {
  profile: PlayerProfile
  level: number
  onBuy: (c: CostumeItem) => void
  onEquip: (slot: Slot, id: string | null) => void
  onSetEquip: (equip: Record<string, string>) => void
  onBack: () => void
}) {
  const { profile, level } = props
  const [outfits, setOutfits] = useState<Record<string, string>[]>(() => loadOutfits())
  const ownedCount = profile.cosmetics.length

  // 보유 아이템을 슬롯별로 묶기 (랜덤 코디용)
  const ownedBySlot = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const id of profile.cosmetics) {
      const c = COSTUMES.find((x) => x.id === id)
      if (c) (m[c.slot] = m[c.slot] ?? []).push(id)
    }
    return m
  }, [profile.cosmetics])

  function randomOutfit() {
    const equip: Record<string, string> = {}
    for (const { slot } of SLOTS) {
      const pool = ownedBySlot[slot] ?? []
      if (pool.length && Math.random() < 0.75) equip[slot] = pool[Math.floor(Math.random() * pool.length)]
    }
    props.onSetEquip(equip)
  }
  function storeOutfit() {
    const next = [{ ...profile.equip }, ...outfits].slice(0, 3)
    setOutfits(next)
    saveOutfits(next)
  }

  return (
    <main className="screen costume">
      <h1 className="title">👕 꾸미기</h1>
      <p className="subtitle">🔔 {profile.coins} 벨 · 보유 {ownedCount}개 · Lv.{level}</p>

      <div className="char-preview big">
        <AnimalCharacter avatar={profile.avatar} equip={profile.equip} className="cp-char" />
        <div className="cp-shadow" />
      </div>

      <div className="costume-tools">
        <button className="tool-btn" onClick={randomOutfit} disabled={ownedCount === 0}>
          🎲 랜덤 코디
        </button>
        <button className="tool-btn" onClick={() => props.onSetEquip({})}>
          🧹 전체 벗기
        </button>
        <button className="tool-btn" onClick={storeOutfit}>
          💾 코디 저장
        </button>
      </div>

      {outfits.length > 0 && (
        <div className="outfit-presets">
          <span className="preset-label">저장한 코디</span>
          <div className="preset-row">
            {outfits.map((o, i) => (
              <button key={i} className="preset-chip" onClick={() => props.onSetEquip(o)}>
                {SLOTS.map(({ slot }) => equippedEmoji(o, slot) || '').join('') || '기본'}
              </button>
            ))}
          </div>
        </div>
      )}

      {SLOTS.map(({ slot, label }) => (
        <div key={slot} className="slot-block">
          <h3 className="section-label">
            {label}
            {profile.equip[slot] && (
              <button className="slot-clear" onClick={() => props.onEquip(slot, null)}>
                벗기
              </button>
            )}
          </h3>
          <div className="costume-grid">
            {itemsForSlot(slot).map((c) => {
              const owned = profile.cosmetics.includes(c.id)
              const equipped = profile.equip[slot] === c.id
              const unlocked = isUnlocked(c, level)
              const afford = profile.coins >= c.price
              return (
                <div
                  key={c.id}
                  className={`costume-item ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
                >
                  <span className="ci-emoji">{unlocked ? c.emoji : '🔒'}</span>
                  <span className="ci-name">{c.name}</span>
                  {!unlocked ? (
                    <span className="ci-lock">Lv.{c.minLevel}</span>
                  ) : owned ? (
                    <button
                      className={`btn ${equipped ? 'primary' : 'ghost'} ci-btn`}
                      onClick={() => props.onEquip(slot, equipped ? null : c.id)}
                    >
                      {equipped ? '착용 중' : '착용'}
                    </button>
                  ) : (
                    <button className="btn accent ci-btn" disabled={!afford} onClick={() => props.onBuy(c)}>
                      🔔 {c.price}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <button className="btn ghost big" onClick={props.onBack}>
        홈으로
      </button>
    </main>
  )
}

// ── 미니게임 선택 ─────────────────────────────────────────────────
function MiniGameSelect(props: {
  unit: Unit
  subject?: string
  onPick: (g: MiniGame) => void
  onBack: () => void
}) {
  const theme = themeOf(props.subject ?? props.unit.subject)
  return (
    <main className={`screen minigame ${theme}`}>
      <h1 className="title sm">{props.unit.unit}</h1>
      <p className="subtitle">어떻게 풀어볼까요?</p>

      <div className="mg-list">
        {MINIGAMES.map((g) => (
          <button key={g.id} className="mg-card" onClick={() => props.onPick(g)}>
            <span className="mg-emoji">{g.emoji}</span>
            <div className="mg-body">
              <b className="mg-name">{g.name}</b>
              <span className="mg-desc">{g.desc}</span>
            </div>
            <span className="mg-go">▶</span>
          </button>
        ))}
      </div>

      <button className="btn ghost big" onClick={props.onBack}>
        단원으로
      </button>
    </main>
  )
}

// 몬스터 배틀 연출 바
function BattleBar(props: { correct: number; total: number }) {
  const hpPct = props.total ? Math.max(0, ((props.total - props.correct) / props.total) * 100) : 100
  const defeated = props.total > 0 && props.correct >= props.total
  return (
    <div className="battle-bar">
      <span className="battle-monster">{defeated ? '💥' : '👾'}</span>
      <div className="battle-hp">
        <div className="battle-hp-fill" style={{ width: `${hpPct}%` }} />
      </div>
      <span className="battle-label">{defeated ? '쓰러뜨림!' : `HP ${Math.round(hpPct)}%`}</span>
    </div>
  )
}

// ── 단원 선택 ─────────────────────────────────────────────────────
function UnitSelect(props: {
  villager: Villager
  units: Unit[]
  profile: PlayerProfile
  onChoose: (u: Unit) => void
  onCreate: () => void
  onBack: () => void
}) {
  const { villager, units, profile } = props
  const theme = themeOf(villager.subject)

  function progress(u: Unit): { mastered: number; total: number } {
    let mastered = 0
    for (const p of u.problems) {
      const m = profile.mastery[p.id]
      if (m && m.streak >= 3) mastered += 1
    }
    return { mastered, total: u.problems.length }
  }

  return (
    <main className={`screen units ${theme}`}>
      <div className="units-head">
        <span className="units-emoji">{villager.emoji}</span>
        <div>
          <h1 className="title sm">{villager.subject} · {villager.name}</h1>
          <p className="subtitle">공부할 단원을 골라요</p>
        </div>
      </div>

      {units.length === 0 ? (
        <p className="empty">아직 단원이 없어요. 사진으로 문제를 추가해 보세요!</p>
      ) : (
        <div className="unit-list">
          {units.map((u) => {
            const { mastered, total } = progress(u)
            const pct = total ? Math.round((mastered / total) * 100) : 0
            const done = total > 0 && mastered === total
            return (
              <button key={u.id} className={`unit-card2 ${done ? 'done' : ''}`} onClick={() => props.onChoose(u)}>
                <div className="unit-titles">
                  <b className="unit-name2">{u.unit}</b>
                  <span className="unit-sub2">
                    {u.grade ? u.grade + ' · ' : ''}
                    {total}문제 · 익힘 {mastered}/{total} {done ? '✅' : ''}
                  </span>
                </div>
                <div className="mission-bar">
                  <div className="mission-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="unit-go">미니게임 고르기 ▶</span>
              </button>
            )
          })}
        </div>
      )}

      <button className="btn primary big" onClick={props.onCreate}>
        ✏️ 직접 문제 만들기
      </button>
      <button className="btn ghost big" onClick={props.onBack}>
        광장으로
      </button>
    </main>
  )
}

// ── 메뉴 (어디서든 빠른 이동 = 대시보드 허브) ─────────────────────
function MainMenu(props: { onGo: (s: Screen) => void; onClose: () => void }) {
  const items: { s: Screen; emoji: string; label: string }[] = [
    { s: 'home', emoji: '🏠', label: '홈' },
    { s: 'subjects', emoji: '📚', label: '공부하기' },
    { s: 'costume', emoji: '👕', label: '꾸미기' },
    { s: 'create', emoji: '✏️', label: '문제 만들기' },
    { s: 'manage', emoji: '🗂️', label: '내 문제 관리' },
    { s: 'teacher', emoji: '👩‍🏫', label: '교사 콘솔' },
    { s: 'ai', emoji: '🤖', label: '사진 변환(AI)' },
    { s: 'dashboard', emoji: '📊', label: '학습 현황' },
    { s: 'dex', emoji: '📜', label: '학습 도감' },
    { s: 'wrong', emoji: '📒', label: '오답노트' },
    { s: 'missions', emoji: '🎯', label: '미션' },
    { s: 'ranking', emoji: '🏆', label: '랭킹' },
    { s: 'room', emoji: '🛖', label: '내 집' },
    { s: 'walk', emoji: '🚶', label: '마을 산책' },
    { s: 'game', emoji: '🎮', label: '필드 (베타)' },
    { s: 'settings', emoji: '⚙️', label: '설정·백업' },
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

// ── 내 문제 관리 (목록·수정·삭제) ─────────────────────────────────
const PTYPE_LABEL: Record<string, string> = {
  multiple_choice: '객관식',
  short_answer: '주관식',
  ox: 'OX',
  fill_blank: '빈칸',
}
function Manage(props: {
  items: CustomItem[]
  onEdit: (item: CustomItem) => void
  onDelete: (item: CustomItem) => void
  onNew: () => void
  onBack: () => void
}) {
  // 과목(villager) → 단원 으로 묶기
  const groups = useMemo(() => {
    const map = new Map<string, { villagerId: string; unitName: string; items: CustomItem[] }>()
    for (const it of props.items) {
      const key = it.villagerId + '||' + it.unitName
      if (!map.has(key)) map.set(key, { villagerId: it.villagerId, unitName: it.unitName, items: [] })
      map.get(key)!.items.push(it)
    }
    return [...map.values()]
  }, [props.items])

  function confirmDelete(it: CustomItem) {
    if (window.confirm('이 문제를 삭제할까요? 되돌릴 수 없어요.')) props.onDelete(it)
  }

  return (
    <main className="screen manage">
      <h1 className="title">🗂️ 내 문제 관리</h1>
      <p className="subtitle">내가 만든 문제 {props.items.length}개 · 수정하거나 지울 수 있어요</p>

      <button className="btn primary" onClick={props.onNew}>
        ➕ 새 문제 만들기
      </button>

      {groups.length === 0 ? (
        <p className="empty">아직 만든 문제가 없어요. 문제를 만들면 여기 모여요!</p>
      ) : (
        groups.map((g) => {
          const v = villagerById(g.villagerId)
          return (
            <section key={g.villagerId + g.unitName} className="manage-group">
              <h3 className="manage-unit">
                {v?.emoji} {v?.subject} · {g.unitName}{' '}
                <span className="manage-count">{g.items.length}</span>
              </h3>
              {g.items.map((it) => (
                <div key={it.problem.id} className="manage-item">
                  <span className={`mtype t-${it.problem.type}`}>
                    {PTYPE_LABEL[it.problem.type] ?? it.problem.type}
                  </span>
                  <span className="manage-prompt">{it.problem.prompt.replace(/\{\{\d+\}\}/g, '___')}</span>
                  <div className="manage-actions">
                    <button className="icon-btn" title="수정" onClick={() => props.onEdit(it)}>
                      ✏️
                    </button>
                    <button className="icon-btn danger" title="삭제" onClick={() => confirmDelete(it)}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )
        })
      )}

      <button className="btn ghost big" onClick={props.onBack}>
        돌아가기
      </button>
    </main>
  )
}

// ── 교사 콘솔 (수업 꾸러미 배포·가져오기) ─────────────────────────
function Teacher(props: {
  items: CustomItem[]
  store: CustomStore
  onImport: (s: CustomStore) => void
  onBack: () => void
}) {
  const [packCode, setPackCode] = useState('')
  const [importText, setImportText] = useState('')
  const [msg, setMsg] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, { villagerId: string; unitName: string; items: CustomItem[] }>()
    for (const it of props.items) {
      const key = it.villagerId + '||' + it.unitName
      if (!map.has(key)) map.set(key, { villagerId: it.villagerId, unitName: it.unitName, items: [] })
      map.get(key)!.items.push(it)
    }
    return [...map.values()]
  }, [props.items])

  function exportGroup(g: { villagerId: string; unitName: string; items: CustomItem[] }) {
    const v = villagerById(g.villagerId)
    const code = makeContentPack(`${v?.subject ?? ''} · ${g.unitName}`, g.items, Date.now())
    setPackCode(code)
    setMsg({ kind: 'good', text: `‘${g.unitName}’ ${g.items.length}문제를 코드로 만들었어요. 학생에게 전달하세요.` })
  }
  function exportAll() {
    if (!props.items.length) return
    const code = makeContentPack('전체 수업 꾸러미', props.items, Date.now())
    setPackCode(code)
    setMsg({ kind: 'good', text: `전체 ${props.items.length}문제를 코드로 만들었어요.` })
  }
  async function copyPack() {
    try {
      await navigator.clipboard.writeText(packCode)
      setMsg({ kind: 'good', text: '복사했어요! 학생들에게 코드를 보내세요.' })
    } catch {
      setMsg({ kind: 'bad', text: '복사가 안 돼요. 길게 눌러 직접 복사해 주세요.' })
    }
  }
  function downloadPack() {
    const blob = new Blob([packCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '수업꾸러미.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
  function doImport() {
    const info = inspectPack(importText)
    if (!info.ok) {
      setMsg({ kind: 'bad', text: info.error ?? '코드를 확인해 주세요.' })
      return
    }
    const r = importPack(importText, props.store)
    if (r.ok && r.store) {
      props.onImport(r.store)
      setImportText('')
      setMsg({
        kind: 'good',
        text: `‘${r.title}’ 가져왔어요! 새로 추가 ${r.added}개${r.skipped ? `, 이미 있던 ${r.skipped}개는 건너뜀` : ''}.`,
      })
    } else {
      setMsg({ kind: 'bad', text: r.error ?? '가져오기에 실패했어요.' })
    }
  }

  return (
    <main className="screen teacher">
      <h1 className="title">👩‍🏫 교사 콘솔</h1>
      <p className="subtitle">내가 만든 문제를 ‘수업 꾸러미’ 코드로 학급에 나눠줘요</p>

      {msg && <div className={`feedback ${msg.kind}`}>{msg.text}</div>}

      <section className="set-card">
        <h3 className="set-h">📦 단원별 내보내기</h3>
        {groups.length === 0 ? (
          <p className="set-note">아직 만든 문제가 없어요. ‘문제 만들기’에서 출제한 뒤 배포할 수 있어요.</p>
        ) : (
          <>
            {groups.map((g) => {
              const v = villagerById(g.villagerId)
              return (
                <div key={g.villagerId + g.unitName} className="teacher-row">
                  <span className="teacher-unit">
                    {v?.emoji} {v?.subject} · {g.unitName} <span className="manage-count">{g.items.length}</span>
                  </span>
                  <button className="btn sm" onClick={() => exportGroup(g)}>
                    내보내기
                  </button>
                </div>
              )
            })}
            <button className="btn" onClick={exportAll}>
              전체 내보내기 ({props.items.length}문제)
            </button>
          </>
        )}
        {packCode && (
          <>
            <textarea className="field-input ta code-box" readOnly rows={3} value={packCode} onFocus={(e) => e.target.select()} />
            <div className="set-row">
              <button className="btn" onClick={copyPack}>📋 복사</button>
              <button className="btn" onClick={downloadPack}>⬇️ 파일 저장</button>
            </div>
          </>
        )}
      </section>

      <section className="set-card">
        <h3 className="set-h">📥 수업 꾸러미 가져오기</h3>
        <p className="set-note">받은 코드를 붙여넣으면 내 문제 목록에 합쳐져요(같은 문제는 건너뜀).</p>
        <textarea
          className="field-input ta"
          rows={3}
          placeholder="수업 꾸러미 코드 (BYEOLSUPPACK1-…)"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <button className="btn primary" disabled={!importText.trim()} onClick={doImport}>
          가져오기
        </button>
      </section>

      <section className="set-card">
        <h3 className="set-h">☁️ 실시간 학급 현황</h3>
        <p className="set-note">
          {firebaseEnabled
            ? '클라우드가 연결돼 있어요. 반 학생들의 진척을 모으는 기능을 이어서 붙일 수 있어요.'
            : '학생별 실시간 진척(누가 몇 점)을 모으려면 클라우드 연결이 필요해요. 지금은 코드로 문제를 배포하는 오프라인 방식이 동작합니다.'}
        </p>
      </section>

      <button className="btn ghost big" onClick={props.onBack}>
        돌아가기
      </button>
    </main>
  )
}

// ── 설정 · 데이터 백업/복원 ───────────────────────────────────────
function Settings(props: { onBack: () => void }) {
  const [muted, setMutedState] = useState(isMuted())
  const [code, setCode] = useState('')
  const [restoreText, setRestoreText] = useState('')
  const [msg, setMsg] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null)

  function genBackup() {
    const c = makeBackup(Date.now())
    setCode(c)
    setMsg({ kind: 'good', text: '백업 코드를 만들었어요. 복사하거나 파일로 저장하세요.' })
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setMsg({ kind: 'good', text: '복사했어요! 안전한 곳(메모·메일)에 보관하세요.' })
    } catch {
      setMsg({ kind: 'bad', text: '복사가 안 돼요. 길게 눌러 직접 복사해 주세요.' })
    }
  }
  function downloadCode() {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `별숲마을-백업.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
  function doRestore() {
    const info = inspectBackup(restoreText)
    if (!info.ok) {
      setMsg({ kind: 'bad', text: info.error ?? '백업 코드를 확인해 주세요.' })
      return
    }
    const when = info.at ? new Date(info.at).toLocaleString('ko-KR') : ''
    if (!window.confirm(`이 백업으로 되돌릴까요?\n(${when} 저장 · 지금 진행은 덮어써집니다)`)) return
    const r = restoreBackup(restoreText)
    if (r.ok) {
      setMsg({ kind: 'good', text: '복원했어요! 잠시 후 새로고침됩니다.' })
      window.setTimeout(() => window.location.reload(), 900)
    } else {
      setMsg({ kind: 'bad', text: r.error ?? '복원에 실패했어요.' })
    }
  }

  return (
    <main className="screen settings">
      <h1 className="title">⚙️ 설정 · 백업</h1>

      {msg && <div className={`feedback ${msg.kind}`}>{msg.text}</div>}

      <section className="set-card">
        <h3 className="set-h">🔊 소리</h3>
        <label className="check-row">
          <input
            type="checkbox"
            checked={!muted}
            onChange={(e) => {
              const on = e.target.checked
              setMuted(!on)
              setMutedState(!on)
            }}
          />{' '}
          효과음 켜기
        </label>
      </section>

      <section className="set-card">
        <h3 className="set-h">☁️ 저장 상태</h3>
        <p className="set-note">
          {firebaseEnabled
            ? '클라우드 동기화가 켜져 있어 기기가 바뀌어도 진행이 유지됩니다.'
            : '이 기기(브라우저)에만 저장돼요. 캐시를 지우거나 기기를 바꾸면 사라질 수 있으니 가끔 백업하세요.'}
        </p>
      </section>

      <section className="set-card">
        <h3 className="set-h">💾 백업 만들기</h3>
        <p className="set-note">레벨·코스튬·코인·오답노트·내가 만든 문제를 코드 하나로 저장해요.</p>
        <button className="btn primary" onClick={genBackup}>
          백업 코드 만들기
        </button>
        {code && (
          <>
            <textarea className="field-input ta code-box" readOnly rows={3} value={code} onFocus={(e) => e.target.select()} />
            <div className="set-row">
              <button className="btn" onClick={copyCode}>
                📋 복사
              </button>
              <button className="btn" onClick={downloadCode}>
                ⬇️ 파일 저장
              </button>
            </div>
          </>
        )}
      </section>

      <section className="set-card">
        <h3 className="set-h">♻️ 백업으로 복원</h3>
        <p className="set-note">백업 코드를 붙여넣고 복원하면 그 시점으로 되돌아가요. 지금 진행은 덮어써집니다.</p>
        <textarea
          className="field-input ta"
          rows={3}
          placeholder="백업 코드를 여기에 붙여넣어요 (BYEOLSUP1-…)"
          value={restoreText}
          onChange={(e) => setRestoreText(e.target.value)}
        />
        <button className="btn warn" disabled={!restoreText.trim()} onClick={doRestore}>
          이 코드로 복원하기
        </button>
      </section>

      <button className="btn ghost big" onClick={props.onBack}>
        돌아가기
      </button>
    </main>
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

      <button className="btn primary big" onClick={() => props.onGo('subjects')}>
        📚 공부하러 가기
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
  const hat = equippedEmoji(profile.equip, 'hat')
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
            <AnimalCharacter avatar={a} equip={{}} className="avatar-thumb" />
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

// ── 가구 상점 (집 꾸미기) ─────────────────────────────────────────
function Shop(props: {
  profile: PlayerProfile
  onBuyFurniture: (f: Furniture) => void
  onBack: () => void
}) {
  const { profile } = props
  return (
    <main className="screen shop">
      <h1 className="title">🛍️ 가구 상점</h1>
      <p className="subtitle">🔔 {profile.coins} 벨 · 집을 꾸며요 (캐릭터는 꾸미기에서)</p>

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

      <button className="btn ghost big" onClick={props.onBack}>
        내 집으로
      </button>
    </main>
  )
}

// ── 레벨업 / 펫 진화 축하 ─────────────────────────────────────────
function LevelUpToast(props: { info: { level: number; pet: PetStage | null }; onClose: () => void }) {
  const { info } = props
  return (
    <div className="levelup-ovl" onClick={props.onClose}>
      <div className="levelup-card" onClick={(e) => e.stopPropagation()}>
        <div className="levelup-rays" aria-hidden />
        <div className="levelup-burst" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="lu-bit" style={{ ['--a' as string]: `${i * 36}deg` }} />
          ))}
        </div>
        <div className="levelup-badge">LEVEL UP!</div>
        <div className="levelup-lv">Lv.{info.level}</div>
        {info.pet ? (
          <div className="levelup-pet">
            <div className="levelup-pet-emoji">{info.pet.emoji}</div>
            <div className="levelup-pet-name">친구가 진화했어요 — {info.pet.name}!</div>
          </div>
        ) : (
          <div className="levelup-sub">더 강해졌어요! 계속 도전해요 🎉</div>
        )}
        <button className="btn primary" onClick={props.onClose}>좋아요 ▶</button>
      </div>
    </div>
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
  const stars = acc >= 90 ? 3 : acc >= 60 ? 2 : acc >= 30 ? 1 : 0
  // 점수 카운트업 연출 (0 → acc)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (stars >= 1) playWin()
    const dur = 900
    let raf = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(acc * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <main className="screen result">
      {stars >= 2 && (
        <div className="confetti" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className={`confetti-bit c${i % 5}`} style={{ left: `${(i * 7 + 4) % 100}%`, animationDelay: `${(i % 7) * 0.15}s` }} />
          ))}
        </div>
      )}
      <h1 className="title">결과</h1>
      <div className="result-stars" aria-label={`별 ${stars}개`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`rstar ${i < stars ? 'on' : ''}`}>
            ★
          </span>
        ))}
      </div>
      <div className="result-big">{shown}점</div>
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
