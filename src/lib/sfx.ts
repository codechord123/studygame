// 가벼운 효과음 — 오디오 파일 없이 WebAudio 로 생성한다. (발소리/상호작용)
// 음소거 상태는 localStorage 에 저장. 첫 사용자 제스처에서 컨텍스트가 깨어난다.

let ctx: AudioContext | null = null
const MUTE_KEY = 'sg.muted'

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1'
}
export function setMuted(m: boolean) {
  localStorage.setItem(MUTE_KEY, m ? '1' : '0')
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

let lastStep = 0
/** 발소리 — 짧고 부드러운 저음 틱 (연속 이동 시 과하지 않게 간격 제한) */
export function playStep() {
  if (isMuted()) return
  const c = ac()
  if (!c) return
  const now = c.currentTime
  if (now - lastStep < 0.07) return
  lastStep = now
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(180 + Math.random() * 40, now)
  o.frequency.exponentialRampToValueAtTime(90, now + 0.08)
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.06, now + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)
  o.connect(g).connect(c.destination)
  o.start(now)
  o.stop(now + 0.11)
}

/** 상호작용 블립 — 밝은 두 음 */
export function playBlip() {
  if (isMuted()) return
  const c = ac()
  if (!c) return
  const now = c.currentTime
  ;[660, 880].forEach((f, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = f
    const t = now + i * 0.08
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + 0.13)
  })
}

// ── 미니게임 효과음 ───────────────────────────────────────────────
function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.14) {
  if (isMuted()) return
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

/** 정답 — 상승하는 두 음 */
export function playCorrect() {
  tone(660, 0, 0.12, 'triangle')
  tone(880, 0.1, 0.16, 'triangle')
}
/** 오답 — 낮게 깔리는 버저 */
export function playWrong() {
  tone(220, 0, 0.18, 'sawtooth', 0.1)
  tone(150, 0.09, 0.22, 'sawtooth', 0.1)
}
/** 풍선/방울 터짐 — 짧은 팝 */
export function playPop() {
  tone(520, 0, 0.06, 'square', 0.09)
  tone(760, 0.04, 0.07, 'square', 0.09)
}
/** 콤보 — 연속 정답마다 점점 높아지는 음 */
export function playCombo(n: number) {
  const base = 520 + Math.min(n, 10) * 45
  tone(base, 0, 0.09, 'triangle')
  tone(base * 1.25, 0.07, 0.12, 'triangle')
}
/** 폭탄 — 둔탁한 폭발음 */
export function playBomb() {
  tone(90, 0, 0.3, 'sawtooth', 0.16)
  tone(60, 0.05, 0.34, 'square', 0.14)
}
/** 승리 팡파르 — 결과 화면 */
export function playWin() {
  ;[523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle', 0.15))
}

// ── 확장 효과음 (게임 퀄리티 강화) ─────────────────────────────────
/** 카운트다운 똑 — 짧고 또렷한 단음 */
export function playTick() {
  tone(880, 0, 0.07, 'triangle', 0.1)
}
/** 시작 신호 — 똑 다음에 터지는 밝은 상승음 */
export function playGo() {
  tone(660, 0, 0.1, 'triangle', 0.14)
  tone(990, 0.08, 0.22, 'triangle', 0.15)
}
/** 레벨업 — 4음 상승 팡파르 */
export function playLevelUp() {
  ;[523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.16, 'triangle', 0.14))
  tone(1318, 0.36, 0.24, 'sine', 0.12)
}
/** 업적 반짝 — 맑은 두 음 + 하이 스파클 */
export function playBadge() {
  tone(1046, 0, 0.1, 'sine', 0.11)
  tone(1568, 0.07, 0.14, 'sine', 0.1)
  tone(2093, 0.14, 0.18, 'sine', 0.07)
}
/** 카드 뒤집기 — 빠른 휙 상승 틱 */
export function playFlip() {
  tone(420, 0, 0.05, 'triangle', 0.08)
  tone(760, 0.04, 0.08, 'triangle', 0.09)
}
/** 분류 휙 — 부드럽게 스쳐 지나가는 휘파람 */
export function playWhoosh() {
  tone(300, 0, 0.07, 'sine', 0.06)
  tone(600, 0.05, 0.09, 'sine', 0.08)
  tone(900, 0.1, 0.1, 'sine', 0.05)
}
/** 타격 — 짧고 단단한 펀치 */
export function playHit() {
  tone(180, 0, 0.08, 'square', 0.13)
  tone(120, 0.04, 0.12, 'sawtooth', 0.1)
}
/** 크리티컬 강타 — 둔탁한 임팩트 위에 번쩍이는 고음 */
export function playCrit() {
  tone(160, 0, 0.12, 'sawtooth', 0.16)
  tone(90, 0.05, 0.16, 'square', 0.13)
  tone(1320, 0.02, 0.1, 'triangle', 0.1)
  tone(1760, 0.1, 0.14, 'triangle', 0.08)
}
/** 패배 — 풀죽은 하강음 */
export function playDefeat() {
  ;[523, 440, 349, 262].forEach((f, i) => tone(f, i * 0.13, 0.22, 'triangle', 0.12))
}
/** 승리 — playWin 보다 큰 팡파르 (5음 상승 + 하이 트릴) */
export function playVictory() {
  ;[523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.16))
  tone(1046, 0.62, 0.12, 'triangle', 0.14)
  tone(1318, 0.74, 0.12, 'triangle', 0.14)
  tone(1568, 0.86, 0.3, 'triangle', 0.15)
}
