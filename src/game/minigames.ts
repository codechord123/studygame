import type { PlayMode } from '../components/QuestionCard'
import type { Problem } from '../types/problem'

// 한 단원을 푸는 여러 미니게임. 게임마다 '동사(핵심 행위)'가 모두 달라 진짜로 다양하다.
//  - kind 'card'   : 문제 카드(QuestionCard). 정독/인출 (학습·빈칸)
//  - kind 'ox'     : 번개 OX — 참/거짓 순간 판단 (생명·콤보)
//  - kind 'sort'   : 분류 대소동 — 떨어지는 항목을 알맞은 바구니로 분류
//  - kind 'boss'   : 보스 러시 — 정답=데미지, 콤보=크리티컬, 오답=반격
//  - kind 'memory' : 4×4 카드 뒤집기 (용어↔뜻 짝)
// pool: 문제 tags 에서 같은 값을 가진 문제만 뽑는다. 'all' 이면 단원 전체에서 골고루.
// count: 한 판에 푸는 문제 수.
export interface MiniGame {
  id: string
  emoji: string
  name: string
  desc: string
  kind: 'card' | 'ox' | 'sort' | 'boss' | 'memory'
  mode: PlayMode
  pool: string
  count: number
}

export const MINIGAMES: MiniGame[] = [
  { id: 'study',  emoji: '📖', name: '차근차근',     desc: '타이머 없이 정답·풀이를 확인하며',       kind: 'card',   mode: 'study',     pool: 'all',    count: 12 },
  { id: 'ox',     emoji: '⚡', name: '번개 OX',      desc: '참이면 O, 거짓이면 X — 생명 3개 반사신경!', kind: 'ox',     mode: 'challenge', pool: 'ox',     count: 16 },
  { id: 'sort',   emoji: '🗂️', name: '분류 대소동',   desc: '떨어지는 카드를 알맞은 바구니로!',         kind: 'sort',   mode: 'challenge', pool: 'all',    count: 10 },
  { id: 'boss',   emoji: '⚔️', name: '보스 러시',     desc: '정답으로 데미지! 콤보로 크리티컬!',        kind: 'boss',   mode: 'challenge', pool: 'battle', count: 10 },
  { id: 'memory', emoji: '🃏', name: '짝꿍 카드',     desc: '4×4 카드에서 용어와 뜻을 짝지어요',       kind: 'memory', mode: 'study',     pool: 'memory', count: 8 },
  { id: 'fill',   emoji: '🔲', name: '빈칸 술술',     desc: '핵심 낱말로 빈칸 채우기 (천천히)',        kind: 'card',   mode: 'study',     pool: 'fill',   count: 10 },
]

export function miniGameById(id: string): MiniGame | undefined {
  return MINIGAMES.find((m) => m.id === id)
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 분류 게임에 쓸 수 있는 문제: 짧은 보기 2~3개의 객관식 또는 OX(참/거짓 2바구니).
function isSortable(p: Problem): boolean {
  if (p.type === 'ox') return true
  if (p.type === 'multiple_choice')
    return p.choices.length >= 2 && p.choices.length <= 3 && p.choices.every((c) => c.length <= 12)
  return false
}

// 같은 '보기 묶음'을 공유하는 가장 큰 그룹을 고른다(= 안정적인 바구니 축).
function dominantSortGroup(problems: Problem[]): Problem[] {
  const groups = new Map<string, Problem[]>()
  for (const p of problems.filter(isSortable)) {
    const sig = p.type === 'ox' ? 'OX' : [...(p as { choices: string[] }).choices].sort().join('|')
    const arr = groups.get(sig) ?? []
    arr.push(p)
    groups.set(sig, arr)
  }
  return [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? []
}

// 미니게임의 성향(pool)에 맞는 문제만 골라 count 만큼 돌려준다.
// 해당 태그 문제가 부족하면(다른 단원 등) 단원 전체에서 뽑는다.
export function pickForGame(g: MiniGame, problems: Problem[]): Problem[] {
  let pool = g.pool === 'all' ? problems : problems.filter((p) => p.tags?.includes(g.pool))
  if (pool.length < 4) pool = problems

  if (g.kind === 'boss') {
    const mc = pool.filter((p) => p.type === 'multiple_choice')
    if (mc.length >= 4) pool = mc
  }

  if (g.kind === 'sort') {
    // 단원 전체에서 같은 바구니 축을 공유하는 그룹을 우선 사용 (없으면 OX 폴백)
    let group = dominantSortGroup(problems)
    if (group.length < 4) {
      const ox = problems.filter((p) => p.type === 'ox')
      group = ox.length >= 4 ? ox : group
    }
    return shuffled(group).slice(0, g.count)
  }

  return shuffled(pool).slice(0, g.count)
}
