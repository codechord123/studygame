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
