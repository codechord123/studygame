import type { PlayMode } from '../components/QuestionCard'
import type { Problem } from '../types/problem'

// 한 단원을 푸는 여러 미니게임. 게임마다 '성향(pool)'이 달라, 그에 맞는 문제만 골라 푼다.
//  - kind 'card'   : 기본 문제 카드(QuestionCard). mode 로 학습/도전 구분
//  - kind 'ox'     : OX 빨리 누르기 (보여준 답이 맞는지 판단)
//  - kind 'memory' : 카드 뒤집기 (문제↔답 짝 맞추기)
// pool: 문제의 tags 에서 같은 값을 가진 문제만 뽑는다. 'all' 이면 단원 전체에서 골고루.
// count: 한 판에 푸는 문제 수.
export interface MiniGame {
  id: string
  emoji: string
  name: string
  desc: string
  kind: 'card' | 'ox' | 'memory'
  mode: PlayMode
  pool: string
  count: number
}

export const MINIGAMES: MiniGame[] = [
  { id: 'study',  emoji: '📖', name: '차근차근',    desc: '타이머 없이 정답·풀이를 확인하며',  kind: 'card',   mode: 'study',     pool: 'all',    count: 12 },
  { id: 'speed',  emoji: '⚡', name: '스피드 퀴즈',  desc: '짧은 문제를 빠르게! 콤보 보너스',    kind: 'card',   mode: 'challenge', pool: 'speed',  count: 12 },
  { id: 'battle', emoji: '⚔️', name: '몬스터 배틀',  desc: '어려운 문제로 몬스터를 물리쳐요',    kind: 'card',   mode: 'challenge', pool: 'battle', count: 10 },
  { id: 'ox',     emoji: '🆗', name: 'OX 진실 게임', desc: '맞으면 O, 틀리면 X 빠르게 판단!',    kind: 'ox',     mode: 'challenge', pool: 'ox',     count: 14 },
  { id: 'memory', emoji: '🃏', name: '짝꿍 카드',    desc: '용어와 뜻을 짝지어 뒤집어요',        kind: 'memory', mode: 'study',     pool: 'memory', count: 6 },
  { id: 'fill',   emoji: '🔲', name: '빈칸 술술',    desc: '핵심 낱말로 빈칸을 채워요',          kind: 'card',   mode: 'challenge', pool: 'fill',   count: 10 },
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

// 미니게임의 성향(pool)에 맞는 문제만 골라 count 만큼 돌려준다.
// 해당 태그 문제가 부족하면(다른 단원 등) 단원 전체에서 뽑는다.
export function pickForGame(g: MiniGame, problems: Problem[]): Problem[] {
  let pool = g.pool === 'all' ? problems : problems.filter((p) => p.tags?.includes(g.pool))
  if (pool.length < 4) pool = problems
  return shuffled(pool).slice(0, g.count)
}
