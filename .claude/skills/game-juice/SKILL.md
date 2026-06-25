---
name: game-juice
description: 게임 손맛(juice)·게임필 도구상자. 게임을 새로 만들거나 다듬을 때, 또는 "juice/주스/손맛/타격감/game feel/연출 추가"를 요청받았을 때 사용. 시청각 피드백(팝업·셰이크·플래시·파티클), 히트스톱, 콤보, 사운드, 보상 심리, 학습게임 특화 기법과 웹/React 복붙 스니펫을 제공한다.
---

# 게임 손맛(Juice) & 게임필 도구상자

게임의 **규칙은 그대로 두고**, 입력에 대한 **즉각적·과장된 시청각 피드백**을 얹어 "반응이 살아있다"는 느낌을 만드는 기법 모음. 같은 게임도 juice가 있으면 훨씬 재밌게 느껴진다 (Jonasson & Purho, *Juice it or lose it*).

> 적용 순서: 먼저 **즉각 반응**(입력 0프레임), 그다음 **피드백 연출**, 마지막으로 **과하지 않게 덜어내기**.

---

## 1. Juice — 보고 듣는 즉각 피드백

| 기법 | 효과 | 웹 구현 힌트 |
|---|---|---|
| 플로팅 숫자/팝업 | +점수·콤보·데미지가 솟아오르며 사라짐 | `translateY` + `opacity` 키프레임 |
| 스쿼시 & 스트레치 | 누르면 눌리고 튕김 | 오버슈트 이징 `cubic-bezier(.34,1.56,.64,1)` |
| 스크린 셰이크 | 큰 사건에 화면 흔들림 | `@keyframes shake`, 강도/지속 조절 |
| 플래시 / 비네트 | 정답 초록·오답 빨강 번쩍, 위기 시 가장자리 글로우 | 전체 오버레이 `background` 펄스 |
| 파티클 | 폭죽·반짝이·먼지 | CSS span 여러 개 또는 canvas |
| 컬러 & 입체 | 큰 컬러블록 + 그림자 버튼, 도형 라벨 | `box-shadow: 0 5px 0 <어두운색>` |

## 2. Game Feel — 조작 반응성

- **히트스톱(hit-stop)** — 타격 순간 50~100ms 정지 → 타격감 폭발. **가성비 1위**.
- **즉각 반응** — 입력에 0프레임 반응, 결과 애니는 별도. "눌렀는데 기다림"이 최악.
- **코요테 타임 / 입력 버퍼** — 살짝 늦은 입력도 받아줌(액션·리듬).
- **이징 곡선** — 선형 금지. 등장 ease-out, 퇴장 ease-in, 튕김 오버슈트.
- **햅틱** — 모바일 웹 `navigator.vibrate([ms])`.

## 3. 사운드 (juice의 절반)

- **레이어드 SFX** — 클릭·정답·오답·콤보 각각. Web Audio 합성이면 에셋 0.
- **음정 상승 콤보** — 연속 성공마다 반음씩 올림 → 도파민.
- **음악 덕킹** — 효과음 날 때 BGM 살짝 줄임.
- **무음 디자인** — 위기엔 소리 빼서 긴장.

## 4. 보상 & 진행감 (심리)

- **콤보/연속 보너스** — 단계별 등급(불꽃·등급명)으로 시각화.
- **점진적 보상** — 별 1~3개, 진행 바, 레벨·코인. "거의 다 왔다" 느낌.
- **간헐적 깜짝 보상** — 가끔 큰 폭죽/희귀 보상(variable reward).
- **빠른 첫 성공** — 쉬운 첫 판으로 온보딩.
- **부드러운 패배** — "게임오버" 대신 "다시 도전 + 복습 동선".

## 5. 모션 디테일

- **앤티시페이션** — 큰 동작 전 살짝 반대로 움츠림.
- **스태거** — 목록/격자 순차 등장 `animation-delay: ${i*0.05}s`.
- **카메라 줌/펀치** — 결정적 순간 살짝 줌인.
- **부드러운 화면 전이** — 즉시 전환 대신 슬라이드/페이드.

## 6. 학습 게임 특화

- **즉시 정오 피드백 + 풀이** — 틀려도 바로 배움.
- **오답 → 복습 루프 시각화** — 오답노트 연결.
- **숙련도 가시화** — 단원별 별/도장, 도감 채우기.
- **막 찍기 방지** — 생명·시간 압박(학습엔 과하지 않게).

---

## 🚀 설치 — 이 스킬이 런타임 코드를 들고 다닌다

이 스킬 폴더에는 **실제 동작 코드가 `module/` 에 번들**되어 있다(자기완결형 드롭인: `sfx.ts`가 juice 안에 포함). 새 프로젝트에서 juice를 쓰려면 **설명만 하지 말고 아래로 설치**한다.

**설치 절차(에이전트가 수행):**
1. 대상 프로젝트에 이미 `src/lib/juice/` 가 있으면 → 그걸 import해서 쓴다(설치 불필요).
2. 없으면 → 이 스킬의 `module/` 를 프로젝트에 복사한다. 스크립트 사용 권장:
   ```bash
   bash <이 스킬 폴더>/install.sh <프로젝트_루트>
   # 예) bash ~/.claude/skills/game-juice/install.sh .
   ```
   스크립트가 없거나 환경이 다르면 동등하게 복사:
   ```bash
   mkdir -p <프로젝트>/src/lib/juice
   cp <이 스킬 폴더>/module/*.ts <프로젝트>/src/lib/juice/
   ```
3. 설치 후 import 해서 사용:
   ```ts
   import { useJuice, shake, flash, burstConfetti, floatText, vibrate } from '<상대경로>/lib/juice'
   ```

**주의**
- 번들 모듈은 `sfx.ts` 가 `src/lib/juice/` **안**에 들어가는 자기완결형이다(이 studygame 저장소는 `src/lib/sfx.ts` 가 바깥에 있는 기존 배치를 유지 — 새 프로젝트만 드롭인 사용).
- `effects.ts / floatText.ts / sfx.ts` 는 **React 불필요**(순수 TS, Web Animations/Web Audio). `useJuice.ts` 만 React 훅 — 비 React 프로젝트면 빼고 쓴다.
- 빌드 도구가 `.ts` 만 받으면 그대로, JS 프로젝트면 타입 제거 후 사용.

## 📦 이 저장소의 재사용 모듈 — `src/lib/juice/`

studygame 안에는 아래 키트가 **실제 동작 코드**로 들어 있다. 새 연출은 흩어서 짜지 말고 여기서 import 한다.

```ts
import { useJuice } from '../lib/juice'
const juice = useJuice()
juice.correct(btnEl, 10) // 정답음 + 초록 플래시 + 진동 + 점수팝업
juice.wrong(cardEl)      // 오답음 + 빨강 플래시 + 셰이크 + 진동
juice.combo(5, el)       // 음정 상승 콤보음 + 콤보 텍스트
juice.win()              // 팡파르 + 폭죽

// 개별 명령형도 가능
import { shake, flash, hitStop, burstConfetti, floatText, vibrate } from '../lib/juice'
```

- `effects.ts` — `shake / flash / hitStop / popIn / burstConfetti / vibrate` (전부 Web Animations API, **외부 CSS 불필요**, `prefers-reduced-motion` 존중)
- `floatText.ts` — `floatText(text,x,y) / floatTextAt(el,text)`
- `useJuice.ts` — 사운드+모션+햅틱 묶음 훅
- `sfx.ts`(`src/lib/sfx.ts`) — 에셋 0 Web Audio 효과음(`playCorrect/playWrong/playCombo/playVictory/...`, 음소거 상태 포함). `juice` barrel 에서 재노출됨.

> 다른 프로젝트로 가져갈 때는 `src/lib/juice/` 폴더와 `src/lib/sfx.ts` 를 함께 복사하면 그대로 동작한다.

## 🎒 핵심 패턴 스니펫 (원리 참고용)

### sfx.ts — 에셋 없는 Web Audio 효과음
```ts
let ctx: AudioContext | null = null
const ac = () => (ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)())
function beep(freq: number, dur = 0.12, type: OscillatorType = 'sine', gain = 0.2) {
  const a = ac(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(gain, a.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur)
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur)
}
export const playCorrect = () => { beep(660); setTimeout(() => beep(990), 90) }
export const playWrong = () => beep(160, 0.2, 'sawtooth', 0.15)
export const playPop = () => beep(520, 0.08, 'triangle')
export const playCombo = (n: number) => beep(440 * Math.pow(2 ** (1 / 12), Math.min(n, 12)), 0.12) // 콤보마다 반음↑
```

### FloatingText — 플로팅 점수 팝업
```tsx
// CSS: .float-text{position:absolute;font-weight:900;animation:floatUp .8s ease forwards;pointer-events:none}
// @keyframes floatUp{0%{transform:translateY(0) scale(.6);opacity:0}
//   30%{transform:translateY(-10px) scale(1.1);opacity:1}
//   100%{transform:translateY(-44px) scale(1);opacity:0}}
export function FloatingText({ text, x, y }: { text: string; x: number; y: number }) {
  return <span className="float-text" style={{ left: x, top: y }}>{text}</span>
}
```

### 히트스톱 + 스크린 셰이크
```ts
// 히트스톱: rAF 루프를 잠깐 멈췄다 재개 (또는 setTimeout으로 다음 처리 지연)
export const hitStop = (ms = 80) => new Promise((r) => setTimeout(r, ms))

// 셰이크: 요소에 클래스 토글
// CSS: @keyframes shake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(4px)}
//   50%{transform:translateX(-6px)}} .shake{animation:shake .4s}
export function shake(el: HTMLElement) {
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake')
}
```

### useJuice — 한 번에 묶기
```ts
export function useJuice() {
  return {
    correct: (el?: HTMLElement) => { playCorrect(); navigator.vibrate?.(20); el && flash(el, 'good') },
    wrong: (el?: HTMLElement) => { playWrong(); navigator.vibrate?.([40, 30, 40]); el && shake(el) },
    combo: (n: number) => playCombo(n),
  }
}
// flash(el,'good'|'bad'): 전체 오버레이에 초록/빨강 펄스 클래스 토글
```

### 파티클(폭죽) — CSS만
```tsx
{Array.from({ length: 14 }, (_, i) => (
  <span key={i} className={`confetti c${i % 5}`}
    style={{ left: `${(i * 7) % 100}%`, animationDelay: `${(i % 7) * 0.1}s` }} />
))}
// @keyframes confettiFall{to{transform:translateY(120vh) rotate(540deg);opacity:0}}
```

---

## 📐 치트시트

- **지속시간**: 마이크로 피드백 80~150ms · 전이 200~350ms · 축하 600~900ms
- **이징**: 등장 `cubic-bezier(.22,1,.36,1)` · 튕김 `cubic-bezier(.34,1.56,.64,1)` · 퇴장 `ease-in`
- **셰이크 강도**: 작은 사건 2~4px · 큰 사건 6~10px (남발 금지)
- **콤보 사운드**: 기준음 × 2^(반음/12), 12반음에서 상한

## ✅ 스타터 체크리스트 (우선순위)

1. 입력 즉시 반응 + **오버슈트 이징**
2. **플로팅 점수 팝업** + **콤보 사운드**
3. **히트스톱**(한 줄, 큰 효과)
4. 정답/오답 **플래시**, 큰 사건 **셰이크**
5. **파티클** + 별 3개 결과
6. **모바일 진동** + 스태거 등장

## ⚠️ 함정 / 접근성

- **과유불금**: 모든 것에 셰이크·파티클을 넣으면 피로. 중요한 순간에 집중.
- **`prefers-reduced-motion`** 존중: `@media (prefers-reduced-motion: reduce){ * { animation: none !important } }`
- **반응 ≠ 연출**: 입력 반응은 즉시, 화려한 연출은 그 위에 별도로.
- **사운드 토글** 제공, 첫 사용자 제스처 후 `AudioContext` 생성(자동재생 정책).
- **성능**: 파티클은 `transform`/`opacity`만 애니메이션(리플로 회피), 많으면 canvas.
- **juice ≠ 게임성**: 손맛은 재미를 *증폭*할 뿐, 핵심 루프가 약하면 juice로 못 살린다.
