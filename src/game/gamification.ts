// 게임 요소: 포인트, 콤보(연속 정답 배수), 타이머 보너스, 레벨/경험치, 뱃지, 펫 성장.

export interface DailyState {
  date: string // YYYY-MM-DD (로컬)
  solved: number // 오늘 푼 문제 수
  bestCombo: number // 오늘 최고 콤보
  claimed: string[] // 오늘 보상 받은 미션 id
}

export interface PlayerProfile {
  xp: number // 누적 경험치 (= 누적 포인트)
  coins: number // 벨(마을 재화)
  badges: string[] // 획득한 뱃지 id 목록
  bestCombo: number
  solvedCount: number
  correctCount: number
  bestScore: number // 한 세트 최고 점수(정답률) — 랭킹용
  cosmetics: string[] // 보유한 옷·모자 id
  equipped: string | null // 착용 중인 꾸미기 id
  daily: DailyState
  // ── 마을/정체성 ──
  onboarded: boolean // 첫 이사(온보딩) 완료 여부
  characterName: string // 내 캐릭터 이름
  avatar: string // 선택한 동물 아바타(이모지)
  furniture: string[] // 보유한 가구 id (집 꾸미기)
  villagerFriends: Record<string, number> // 주민별 친밀도 점수
  houseStage: number // 집 짓기 단계 (0~5)
  mastery: Record<string, { seen: number; streak: number; wrong: boolean; subject?: string; unit?: string }> // 문항별 숙련도
}

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export const emptyProfile: PlayerProfile = {
  xp: 0,
  coins: 0,
  badges: [],
  bestCombo: 0,
  solvedCount: 0,
  correctCount: 0,
  bestScore: 0,
  cosmetics: [],
  equipped: null,
  daily: { date: todayStr(), solved: 0, bestCombo: 0, claimed: [] },
  onboarded: false,
  characterName: '',
  avatar: '🐱',
  furniture: [],
  villagerFriends: {},
  houseStage: 0,
  mastery: {},
}

/** 저장된 프로필을 최신 스키마로 보정 + 날짜 바뀌면 일일 상태 초기화 */
export function normalizeProfile(p: Partial<PlayerProfile> | null | undefined): PlayerProfile {
  const merged: PlayerProfile = { ...emptyProfile, ...(p ?? {}) }
  merged.daily = { ...emptyProfile.daily, ...(p?.daily ?? {}) }
  merged.villagerFriends = { ...(p?.villagerFriends ?? {}) }
  merged.furniture = [...(p?.furniture ?? [])]
  merged.mastery = { ...(p?.mastery ?? {}) }
  if (merged.daily.date !== todayStr()) {
    merged.daily = { date: todayStr(), solved: 0, bestCombo: 0, claimed: [] }
  }
  return merged
}

// ── 레벨 ──────────────────────────────────────────────────────────
// 레벨 n 까지 필요한 누적 경험치: 50 * n^2 (완만한 곡선)
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1
}
export function xpForLevel(level: number): number {
  return 50 * Math.pow(level - 1, 2)
}
export function levelProgress(xp: number): { level: number; cur: number; need: number } {
  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, cur: xp - base, need: next - base }
}

// ── 콤보 배수 ─────────────────────────────────────────────────────
// 연속 정답이 쌓일수록 배수 증가 (x1.0 → +0.1/정답, 최대 x3.0)
export function comboMultiplier(combo: number): number {
  return Math.min(1 + Math.max(0, combo - 1) * 0.1, 3)
}

// ── 한 문제 정답 시 획득 포인트 계산 ──────────────────────────────
export interface ScoreInput {
  basePoints: number
  combo: number // 이번 정답을 포함한 연속 정답 수
  timeLeftRatio?: number // 0~1, 타이머 남은 비율 (속도 보너스)
}
export function computeScore({ basePoints, combo, timeLeftRatio = 0 }: ScoreInput): number {
  const mult = comboMultiplier(combo)
  const speedBonus = Math.round(basePoints * 0.5 * timeLeftRatio)
  return Math.round(basePoints * mult) + speedBonus
}

// ── 펫 단계 (레벨에 따라 성장) ────────────────────────────────────
export interface PetStage {
  emoji: string
  name: string
}
const PET_STAGES: PetStage[] = [
  { emoji: '🥚', name: '알' },
  { emoji: '🐣', name: '아기새' },
  { emoji: '🐥', name: '병아리' },
  { emoji: '🐤', name: '노랑이' },
  { emoji: '🐔', name: '어른새' },
  { emoji: '🦅', name: '독수리' },
  { emoji: '🐉', name: '드래곤' },
]
export function petForLevel(level: number): PetStage {
  const idx = Math.min(Math.floor((level - 1) / 2), PET_STAGES.length - 1)
  return PET_STAGES[idx]
}

// ── 뱃지 정의 ─────────────────────────────────────────────────────
export interface Badge {
  id: string
  emoji: string
  name: string
  desc: string
  /** 세션 결과를 받아 획득 조건 충족 여부 반환 */
  earned: (ctx: BadgeContext) => boolean
}
export interface BadgeContext {
  profile: PlayerProfile
  sessionCorrect: number
  sessionTotal: number
  sessionBestCombo: number
  perfect: boolean
}

export const BADGES: Badge[] = [
  {
    id: 'first-correct',
    emoji: '🌱',
    name: '첫 정답',
    desc: '첫 문제를 맞혔어요',
    earned: (c) => c.profile.correctCount >= 1,
  },
  {
    id: 'combo-5',
    emoji: '🔥',
    name: '5콤보',
    desc: '5문제 연속 정답',
    earned: (c) => c.sessionBestCombo >= 5,
  },
  {
    id: 'perfect',
    emoji: '💯',
    name: '올백',
    desc: '한 세트 전부 정답',
    earned: (c) => c.perfect && c.sessionTotal > 0,
  },
  {
    id: 'level-5',
    emoji: '⭐',
    name: '레벨 5',
    desc: '레벨 5 달성',
    earned: (c) => levelFromXp(c.profile.xp) >= 5,
  },
  {
    id: 'grind-50',
    emoji: '📚',
    name: '문제 사냥꾼',
    desc: '문제 50개 풀이',
    earned: (c) => c.profile.solvedCount >= 50,
  },
]

/** 이번 세션으로 새로 획득한 뱃지들 반환 */
export function newlyEarnedBadges(ctx: BadgeContext): Badge[] {
  return BADGES.filter((b) => !ctx.profile.badges.includes(b.id) && b.earned(ctx))
}
