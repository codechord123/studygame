import { levelFromXp, type PlayerProfile } from './gamification'
import { MASTER_STREAK, type MasteryMap } from './mastery'

// 학습 도감 + 전시품. 공부한 만큼 과목·단원이 채워지고, 성취가 트로피가 되어
// 집에 전시된다 → "꾸미기 = 내가 공부한 기록".

export interface SubjectStat {
  subject: string
  emoji: string
  seen: number // 풀어본 문항 수
  mastered: number // 익힌 문항 수 (연속정답 MASTER_STREAK 이상)
}

const SUBJECT_EMOJI: Record<string, string> = {
  수학: '🧮',
  국어: '📖',
  사회: '🗺️',
  과학: '🔬',
}
export function subjectEmoji(subject: string): string {
  return SUBJECT_EMOJI[subject] ?? '📚'
}

export function subjectStats(mastery: MasteryMap): SubjectStat[] {
  const map = new Map<string, SubjectStat>()
  for (const e of Object.values(mastery)) {
    const subject = e.subject ?? '기타'
    const s = map.get(subject) ?? { subject, emoji: subjectEmoji(subject), seen: 0, mastered: 0 }
    s.seen += 1
    if (e.streak >= MASTER_STREAK) s.mastered += 1
    map.set(subject, s)
  }
  return [...map.values()].sort((a, b) => b.seen - a.seen)
}

export function masteredBySubject(mastery: MasteryMap): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of Object.values(mastery)) {
    if (e.streak >= MASTER_STREAK && e.subject) out[e.subject] = (out[e.subject] ?? 0) + 1
  }
  return out
}

export interface UnitCard {
  subject: string
  unit: string
  seen: number
  mastered: number
  done: boolean // 단원 내 문항을 모두 익혔는지
}

export function unitCards(mastery: MasteryMap): UnitCard[] {
  const map = new Map<string, UnitCard>()
  for (const e of Object.values(mastery)) {
    if (!e.unit) continue
    const key = (e.subject ?? '') + '|' + e.unit
    const c = map.get(key) ?? { subject: e.subject ?? '기타', unit: e.unit, seen: 0, mastered: 0, done: false }
    c.seen += 1
    if (e.streak >= MASTER_STREAK) c.mastered += 1
    map.set(key, c)
  }
  const cards = [...map.values()]
  cards.forEach((c) => (c.done = c.seen > 0 && c.mastered === c.seen))
  return cards.sort((a, b) => b.mastered - a.mastered)
}

/** 모든 문항을 익힌 '완성 단원'의 키 목록 (보상 지급 비교용) */
export function completedUnitKeys(mastery: MasteryMap): string[] {
  return unitCards(mastery)
    .filter((c) => c.done)
    .map((c) => c.subject + '|' + c.unit)
}
export const UNIT_REWARD = 25 // 단원 완성 시 보너스 벨

// ── 전시 트로피 (집에 진열) ───────────────────────────────────────
export interface Trophy {
  id: string
  emoji: string
  name: string
  desc: string
  earned: boolean
}

export function trophies(profile: PlayerProfile, mastery: MasteryMap): Trophy[] {
  const lvl = levelFromXp(profile.xp)
  const mbs = masteredBySubject(mastery)
  const subjectsStudied = subjectStats(mastery).length
  const totalMastered = Object.values(mbs).reduce((a, b) => a + b, 0)
  const list: { id: string; emoji: string; name: string; desc: string; cond: boolean }[] = [
    { id: 'shelf', emoji: '📚', name: '학습 책장', desc: '과목 1개 이상 공부', cond: subjectsStudied >= 1 },
    { id: 'math', emoji: '🧮', name: '수학 도장', desc: '수학 3문항 익힘', cond: (mbs['수학'] ?? 0) >= 3 },
    { id: 'korean', emoji: '📖', name: '국어 도장', desc: '국어 3문항 익힘', cond: (mbs['국어'] ?? 0) >= 3 },
    { id: 'social', emoji: '🗺️', name: '사회 도장', desc: '사회 3문항 익힘', cond: (mbs['사회'] ?? 0) >= 3 },
    { id: 'science', emoji: '🔬', name: '과학 도장', desc: '과학 3문항 익힘', cond: (mbs['과학'] ?? 0) >= 3 },
    { id: 'frame', emoji: '🖼️', name: '명예의 액자', desc: '총 10문항 익힘', cond: totalMastered >= 10 },
    { id: 'combo', emoji: '🔥', name: '콤보 마스터', desc: '5콤보 달성', cond: profile.bestCombo >= 5 },
    { id: 'medal', emoji: '🥇', name: '올백 메달', desc: '한 세트 만점', cond: profile.badges.includes('perfect') },
    { id: 'trophy', emoji: '🏆', name: '우승컵', desc: '레벨 5 달성', cond: lvl >= 5 },
    { id: 'star', emoji: '🌟', name: '별 수집가', desc: '정답 50개', cond: profile.correctCount >= 50 },
    { id: 'mansion', emoji: '🏰', name: '대저택 명패', desc: '집 최고 단계', cond: profile.houseStage >= 5 },
  ]
  return list.map(({ cond, ...t }) => ({ ...t, earned: cond }))
}
