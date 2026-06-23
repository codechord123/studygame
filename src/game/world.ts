// 별숲 마을 — 동물의 숲 풍 세계관. 모든 과목 학습이 하나의 캐릭터 정체성으로 연결된다.

export const TOWN_NAME = '별숲 마을'

// ── 내 캐릭터 아바타 선택지 ───────────────────────────────────────
export const AVATARS = ['🐱', '🐶', '🐰', '🐻', '🦊', '🐼', '🐯', '🐨', '🐹', '🐸', '🐧', '🦄']

// ── 레벨 칭호 (진화 대신 일관된 정체성/성장) ──────────────────────
export interface Title {
  min: number
  name: string
}
const TITLES: Title[] = [
  { min: 1, name: '새내기 이웃' },
  { min: 3, name: '마을 친구' },
  { min: 5, name: '단골 학생' },
  { min: 8, name: '동네 우등생' },
  { min: 12, name: '마을 지킴이' },
  { min: 16, name: '별숲의 별' },
  { min: 20, name: '전설의 마을지기' },
]
export function titleForLevel(level: number): string {
  let t = TITLES[0].name
  for (const x of TITLES) if (level >= x.min) t = x.name
  return t
}

// ── 주민(NPC) = 과목 ──────────────────────────────────────────────
export interface Villager {
  id: string
  emoji: string
  name: string
  subject: string
  /** 말을 걸 때 대사 */
  greeting: string
  /** 친밀도가 높아지면 보여줄 한마디 */
  bond: string
}

export const VILLAGERS: Villager[] = [
  {
    id: 'math',
    emoji: '🦝',
    name: '셈돌이',
    subject: '수학',
    greeting: '분수 때문에 머리가 빙글빙글 돌아... 나랑 같이 풀어줄래?',
    bond: '너 덕분에 분수가 하나도 안 무서워졌어!',
  },
  {
    id: 'korean',
    emoji: '🦉',
    name: '글봄',
    subject: '국어',
    greeting: '예쁜 낱말을 모으는 게 취미야. 같이 국어 공부할래?',
    bond: '우리 둘이서 마을 도서관을 채워보자!',
  },
  {
    id: 'social',
    emoji: '🦊',
    name: '누리',
    subject: '사회',
    greeting: '우리 마을과 세상 이야기를 알려줄게. 사회 문제 도전해볼래?',
    bond: '넌 이제 마을의 어엿한 안내자야!',
  },
  {
    id: 'science',
    emoji: '🐢',
    name: '바위',
    subject: '과학',
    greeting: '신기한 실험 노트가 있어. 과학의 비밀을 같이 풀어보자!',
    bond: '우리 발견을 마을 모두에게 알리자!',
  },
]

export function villagerById(id: string): Villager | undefined {
  return VILLAGERS.find((v) => v.id === id)
}

/** 친밀도 점수 → 하트 개수(최대 5) */
export function friendHearts(points: number): number {
  return Math.min(5, Math.floor(points / 20))
}

// ── 가구 (집 꾸미기) ──────────────────────────────────────────────
export interface Furniture {
  id: string
  emoji: string
  name: string
  price: number
}
export const FURNITURE: Furniture[] = [
  { id: 'rug', emoji: '🟫', name: '포근한 러그', price: 40 },
  { id: 'plant', emoji: '🪴', name: '화분', price: 60 },
  { id: 'lamp', emoji: '💡', name: '전등', price: 70 },
  { id: 'desk', emoji: '🪑', name: '공부 책상', price: 100 },
  { id: 'shelf', emoji: '📚', name: '책장', price: 120 },
  { id: 'tv', emoji: '📺', name: '텔레비전', price: 160 },
  { id: 'piano', emoji: '🎹', name: '피아노', price: 220 },
  { id: 'window', emoji: '🪟', name: '큰 창문', price: 90 },
]
export function furnitureById(id: string): Furniture | undefined {
  return FURNITURE.find((f) => f.id === id)
}

// ── 집 짓기 (문제로 모은 벨로 단계별 완성) ────────────────────────
export interface HouseStage {
  emoji: string
  name: string
  cost: number // 이 단계로 올리는 데 드는 벨 (누적 아님)
}
export const HOUSE_STAGES: HouseStage[] = [
  { emoji: '⛺', name: '텐트', cost: 0 },
  { emoji: '🛖', name: '오두막', cost: 150 },
  { emoji: '🏠', name: '아담한 집', cost: 400 },
  { emoji: '🏡', name: '정원 집', cost: 800 },
  { emoji: '🏘️', name: '큰 저택', cost: 1500 },
  { emoji: '🏰', name: '별빛 성', cost: 3000 },
]
export const MAX_HOUSE_STAGE = HOUSE_STAGES.length - 1

export function houseInfo(stage: number): HouseStage {
  return HOUSE_STAGES[Math.max(0, Math.min(stage, MAX_HOUSE_STAGE))]
}
/** 다음 단계로 올리는 비용. 최종 단계면 null */
export function nextHouseCost(stage: number): number | null {
  return stage >= MAX_HOUSE_STAGE ? null : HOUSE_STAGES[stage + 1].cost
}
/** 경험치로부터 집 단계 추정 (반 친구 등 stage 정보가 없을 때) */
export function houseStageFromXp(xp: number): number {
  const thresholds = [0, 120, 400, 800, 1500, 3000]
  let s = 0
  thresholds.forEach((t, i) => {
    if (xp >= t) s = i
  })
  return s
}

// ── 우리 반 (가상 공간의 반 친구들) ───────────────────────────────
// 오프라인 기본값(봇). Firebase 연동 시 실제 반 친구 데이터로 대체된다.
export interface Classmate {
  name: string
  avatar: string
  xp: number
  houseStage: number
  me?: boolean
}
export const CLASSMATES: Classmate[] = [
  { name: '민준', avatar: '🐯', xp: 1600, houseStage: 4 },
  { name: '서연', avatar: '🐰', xp: 1150, houseStage: 3 },
  { name: '도윤', avatar: '🐻', xp: 820, houseStage: 3 },
  { name: '하은', avatar: '🐨', xp: 560, houseStage: 2 },
  { name: '시우', avatar: '🐶', xp: 430, houseStage: 2 },
  { name: '지아', avatar: '🐼', xp: 300, houseStage: 1 },
  { name: '준서', avatar: '🦊', xp: 150, houseStage: 1 },
  { name: '유나', avatar: '🐹', xp: 60, houseStage: 0 },
]

// ── 서사: 첫 도착 인트로 ──────────────────────────────────────────
export const INTRO_STORY: string[] = [
  '딸랑— 기차가 작은 시골 역에 멈췄어요.',
  '이름하여 별숲 마을. 밤이면 공부한 만큼 별이 반짝이는 동네래요.',
  '마을 주민들은 저마다 어려워하는 공부가 있어서, 도와줄 친구를 기다리고 있었어요.',
  '“네가 와줘서 정말 기뻐! 문제를 같이 풀어주면, 우리 마을이 점점 빛날 거야.”',
  '자, 이제 네 이야기를 시작해 볼까요?',
]
