import type { PlayMode } from '../components/QuestionCard'

// 한 단원을 푸는 여러 미니게임. 같은 문제 세트를 다른 방식/연출로 풀이한다.
export interface MiniGame {
  id: string
  emoji: string
  name: string
  desc: string
  mode: PlayMode
}

export const MINIGAMES: MiniGame[] = [
  { id: 'study', emoji: '📖', name: '차근차근', desc: '타이머 없이 정답·풀이를 확인하며', mode: 'study' },
  { id: 'speed', emoji: '⚡', name: '스피드 퀴즈', desc: '제한시간 안에! 콤보 보너스', mode: 'challenge' },
  { id: 'battle', emoji: '⚔️', name: '몬스터 배틀', desc: '맞힐 때마다 몬스터를 물리쳐요', mode: 'challenge' },
]

export function miniGameById(id: string): MiniGame | undefined {
  return MINIGAMES.find((m) => m.id === id)
}
