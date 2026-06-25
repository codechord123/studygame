// 게임 손맛(juice) 재사용 키트 — 이 모듈 하나로 사운드·모션·햅틱·파티클·플로팅텍스트.
// 기법/원칙 레퍼런스: .claude/skills/game-juice/SKILL.md
//
// 예시:
//   import { useJuice } from '@/lib/juice'
//   const juice = useJuice()
//   juice.correct(buttonEl, 10)   // 정답음 + 플래시 + 진동 + 점수팝업
//   juice.wrong(cardEl)           // 오답음 + 셰이크 + 진동
//   juice.win()                   // 팡파르 + 폭죽
//
// 또는 개별 명령형 호출:
//   import { shake, flash, burstConfetti, floatText, vibrate, playCombo } from '@/lib/juice'

export * from './sfx' // playCorrect/playWrong/playCombo/playWin/... (음소거 상태 포함)
export * from './effects' // shake/flash/hitStop/popIn/burstConfetti/vibrate
export * from './floatText' // floatText/floatTextAt
export * from './useJuice' // useJuice 훅
