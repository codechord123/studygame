import type { PlayMode } from '../components/QuestionCard'
import type { Problem } from '../types/problem'

// 한 단원을 푸는 여러 미니게임. 게임마다 '성향'과 '방식(kind)'이 모두 달라 다양하게 즐긴다.
//  - kind 'card'   : 문제 카드(QuestionCard). mode 로 학습/도전 구분
//  - kind 'ox'     : OX 빨리 누르기 (보여준 답이 맞는지 판단)
//  - kind 'memory' : 4×4 카드 뒤집기 (문제↔답 짝 맞추기)
//  - kind 'rain'   : 산성비 피하기 (빗방울을 눌러 문제 풀기) — 아케이드
//  - kind 'mole'   : 두더지 잡기 (정답을 든 두더지 콩!) — 아케이드
//  - kind 'balloon': 풍선 터뜨리기 (정답 풍선 펑!) — 아케이드
// pool: 문제 tags 에서 같은 값을 가진 문제만 뽑는다. 'all' 이면 단원 전체에서 골고루.
// count: 한 판에 푸는 문제 수.
export interface MiniGame {
  id: string
  emoji: string
  name: string
  desc: string
  kind: 'card' | 'ox' | 'memory' | 'rain' | 'mole' | 'balloon'
  mode: PlayMode
  pool: string
  count: number
}

export const MINIGAMES: MiniGame[] = [
  { id: 'study',  emoji: '📖', name: '차근차근',     desc: '타이머 없이 정답·풀이를 확인하며',     kind: 'card',   mode: 'study',     pool: 'all',    count: 12 },
  { id: 'rain',   emoji: '🌧️', name: '산성비 피하기', desc: '빗방울을 콕! 누르면 문제가 나와요',     kind: 'rain',   mode: 'challenge', pool: 'speed',  count: 8 },
  { id: 'mole',   emoji: '🔨', name: '두더지 잡기',   desc: '정답을 든 두더지를 콩! (천천히)',       kind: 'mole',   mode: 'challenge', pool: 'battle', count: 8 },
  { id: 'balloon',emoji: '🎈', name: '풍선 터뜨리기', desc: '정답이 든 풍선을 펑! 터뜨려요',         kind: 'balloon',mode: 'challenge', pool: 'speed',  count: 8 },
  { id: 'ox',     emoji: '🆗', name: 'OX 진실 게임',  desc: '맞으면 O, 틀리면 X 빠르게 판단!',       kind: 'ox',     mode: 'challenge', pool: 'ox',     count: 14 },
  { id: 'memory', emoji: '🃏', name: '짝꿍 카드',     desc: '4×4 카드에서 용어와 뜻을 짝지어요',     kind: 'memory', mode: 'study',     pool: 'memory', count: 8 },
  { id: 'fill',   emoji: '🔲', name: '빈칸 술술',     desc: '핵심 낱말로 빈칸 채우기 (천천히)',      kind: 'card',   mode: 'challenge', pool: 'fill',   count: 10 },
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
// 아케이드(산성비·두더지)는 보기를 잡는 방식이라 객관식만 사용한다.
export function pickForGame(g: MiniGame, problems: Problem[]): Problem[] {
  let pool = g.pool === 'all' ? problems : problems.filter((p) => p.tags?.includes(g.pool))
  if (pool.length < 4) pool = problems
  if (g.kind === 'mole' || g.kind === 'balloon') {
    const mc = pool.filter((p) => p.type === 'multiple_choice')
    if (mc.length >= 4) pool = mc
  }
  return shuffled(pool).slice(0, g.count)
}
