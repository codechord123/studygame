import type { PlayMode } from '../components/QuestionCard'

// 한 단원을 푸는 여러 미니게임. 같은 문제 세트를 다른 방식/연출로 풀이한다.
//  - kind 'card'   : 기본 문제 카드(QuestionCard). mode 로 학습/도전 구분
//  - kind 'ox'     : OX 빨리 누르기 (보여준 답이 맞는지 판단)
//  - kind 'memory' : 카드 뒤집기 (문제↔답 짝 맞추기)
export interface MiniGame {
  id: string
  emoji: string
  name: string
  desc: string
  kind: 'card' | 'ox' | 'memory'
  mode: PlayMode
}

export const MINIGAMES: MiniGame[] = [
  { id: 'study', emoji: '📖', name: '차근차근', desc: '타이머 없이 정답·풀이를 확인하며', kind: 'card', mode: 'study' },
  { id: 'speed', emoji: '⚡', name: '스피드 퀴즈', desc: '제한시간 안에! 콤보 보너스', kind: 'card', mode: 'challenge' },
  { id: 'battle', emoji: '⚔️', name: '몬스터 배틀', desc: '맞힐 때마다 몬스터를 물리쳐요', kind: 'card', mode: 'challenge' },
  { id: 'ox', emoji: '🆗', name: 'OX 빨리 누르기', desc: '보여준 답이 맞는지 빠르게 판단!', kind: 'ox', mode: 'challenge' },
  { id: 'memory', emoji: '🃏', name: '카드 뒤집기', desc: '문제와 답을 짝지어요', kind: 'memory', mode: 'study' },
]

export function miniGameById(id: string): MiniGame | undefined {
  return MINIGAMES.find((m) => m.id === id)
}
