import type { DailyState, PlayerProfile } from './gamification'

// 게임 확장 요소: 펫 꾸미기 상점, 일일 미션, 랭킹 보드.

// ── 펫 꾸미기 상점 ────────────────────────────────────────────────
export interface Cosmetic {
  id: string
  emoji: string
  name: string
  price: number
}

export const COSMETICS: Cosmetic[] = [
  { id: 'bow', emoji: '🎀', name: '리본', price: 50 },
  { id: 'glasses', emoji: '🕶️', name: '선글라스', price: 70 },
  { id: 'party', emoji: '🎉', name: '파티모자', price: 90 },
  { id: 'crown', emoji: '👑', name: '왕관', price: 140 },
  { id: 'wizard', emoji: '🧙', name: '마법사 모자', price: 180 },
  { id: 'star', emoji: '🌟', name: '반짝이', price: 220 },
]

export function cosmeticById(id: string | null): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id)
}

// ── 일일 미션 ─────────────────────────────────────────────────────
export interface Mission {
  id: string
  emoji: string
  name: string
  goal: number
  reward: number // 코인
  metric: 'solved' | 'bestCombo'
}

export const DAILY_MISSIONS: Mission[] = [
  { id: 'solve10', emoji: '📝', name: '오늘 문제 10개 풀기', goal: 10, reward: 30, metric: 'solved' },
  { id: 'combo5', emoji: '🔥', name: '오늘 5콤보 달성', goal: 5, reward: 40, metric: 'bestCombo' },
  { id: 'solve25', emoji: '💪', name: '오늘 문제 25개 풀기', goal: 25, reward: 80, metric: 'solved' },
]

export function missionProgress(m: Mission, daily: DailyState): number {
  return Math.min(daily[m.metric], m.goal)
}
export function missionComplete(m: Mission, daily: DailyState): boolean {
  return daily[m.metric] >= m.goal
}
export function missionClaimable(m: Mission, daily: DailyState): boolean {
  return missionComplete(m, daily) && !daily.claimed.includes(m.id)
}

// ── 랭킹 보드 (로컬 모의 데이터 + 플레이어) ──────────────────────
// 지금은 봇 점수와 비교. Firebase 연동 시 실제 사용자 점수로 교체한다.
export interface RankEntry {
  name: string
  score: number
  me?: boolean
}

const BOTS: { name: string; score: number }[] = [
  { name: '수학왕 민준', score: 980 },
  { name: '분수마스터 서연', score: 910 },
  { name: '계산천재 도윤', score: 860 },
  { name: '열공이 하은', score: 700 },
  { name: '도전자 시우', score: 640 },
  { name: '꾸준이 지아', score: 520 },
  { name: '새싹 준서', score: 410 },
]

export function leaderboard(profile: PlayerProfile): { rows: RankEntry[]; myRank: number } {
  const rows: RankEntry[] = [
    ...BOTS,
    { name: '나', score: profile.bestScore, me: true },
  ].sort((a, b) => b.score - a.score)
  const myRank = rows.findIndex((r) => r.me) + 1
  return { rows, myRank }
}
