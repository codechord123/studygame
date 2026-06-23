import { equippedEmoji } from '../game/costume'

// 전신 동물 캐릭터(SVG). 종류는 아바타 이모지로 결정되고, 코스튬을 위에 얹는다.
// 외부 아트 없이 코드로 그린다.

type Ear = 'pointed' | 'round' | 'long' | 'none'
type Tail = 'curl' | 'bush' | 'puff' | 'none'
interface Species {
  main: string
  belly: string
  inner: string
  ear: Ear
  tail: Tail
  beak?: boolean
}

const SP: Record<string, Species> = {
  '🐱': { main: '#b3b3bd', belly: '#ececf2', inner: '#ffc1cc', ear: 'pointed', tail: 'curl' },
  '🐶': { main: '#cb9a64', belly: '#efdcc2', inner: '#b97f50', ear: 'round', tail: 'bush' },
  '🐰': { main: '#f1f1f6', belly: '#ffffff', inner: '#ffc1cc', ear: 'long', tail: 'puff' },
  '🐻': { main: '#9c6b43', belly: '#c89a6e', inner: '#7f5536', ear: 'round', tail: 'none' },
  '🦊': { main: '#e8843b', belly: '#f6e7cf', inner: '#ffffff', ear: 'pointed', tail: 'bush' },
  '🐼': { main: '#f2f2f4', belly: '#ffffff', inner: '#2b2b2b', ear: 'round', tail: 'none' },
  '🐯': { main: '#f2a13c', belly: '#ffffff', inner: '#d98326', ear: 'round', tail: 'curl' },
  '🐨': { main: '#a9b0b8', belly: '#d7dbe0', inner: '#c6cbd1', ear: 'round', tail: 'none' },
  '🐹': { main: '#e7c79a', belly: '#fff6e9', inner: '#f0c0c0', ear: 'round', tail: 'none' },
  '🐸': { main: '#6fc36b', belly: '#d8efc2', inner: '#4f9a4c', ear: 'none', tail: 'none' },
  '🐧': { main: '#3a4163', belly: '#ffffff', inner: '#f2a13c', ear: 'none', tail: 'none', beak: true },
  '🦄': { main: '#f0e6ff', belly: '#ffffff', inner: '#ffc1cc', ear: 'pointed', tail: 'bush' },
}
function speciesOf(avatar: string): Species {
  return SP[avatar] ?? SP['🐱']
}

function Ears({ s }: { s: Species }) {
  const stroke = 'rgba(0,0,0,0.12)'
  if (s.ear === 'none') return null
  if (s.ear === 'pointed')
    return (
      <>
        <polygon points="34,30 30,8 52,26" fill={s.main} stroke={stroke} />
        <polygon points="86,30 90,8 68,26" fill={s.main} stroke={stroke} />
        <polygon points="36,28 34,15 47,26" fill={s.inner} />
        <polygon points="84,28 86,15 73,26" fill={s.inner} />
      </>
    )
  if (s.ear === 'long')
    return (
      <>
        <ellipse cx="44" cy="14" rx="8" ry="22" fill={s.main} stroke={stroke} />
        <ellipse cx="76" cy="14" rx="8" ry="22" fill={s.main} stroke={stroke} />
        <ellipse cx="44" cy="16" rx="4" ry="16" fill={s.inner} />
        <ellipse cx="76" cy="16" rx="4" ry="16" fill={s.inner} />
      </>
    )
  // round
  return (
    <>
      <circle cx="36" cy="24" r="13" fill={s.main} stroke={stroke} />
      <circle cx="84" cy="24" r="13" fill={s.main} stroke={stroke} />
      <circle cx="36" cy="24" r="7" fill={s.inner} />
      <circle cx="84" cy="24" r="7" fill={s.inner} />
    </>
  )
}

function Tail({ s }: { s: Species }) {
  const stroke = 'rgba(0,0,0,0.12)'
  if (s.tail === 'none') return null
  if (s.tail === 'puff') return <circle cx="92" cy="116" r="9" fill={s.belly} stroke={stroke} />
  if (s.tail === 'bush')
    return <ellipse cx="96" cy="104" rx="13" ry="20" fill={s.main} stroke={stroke} transform="rotate(28 96 104)" />
  // curl
  return (
    <path
      d="M88,112 q22,-2 18,-22 q-1,-12 -12,-12"
      fill="none"
      stroke={s.main}
      strokeWidth="9"
      strokeLinecap="round"
    />
  )
}

export function AnimalCharacter({
  avatar,
  equip,
  className = '',
}: {
  avatar: string
  equip: Record<string, string>
  className?: string
}) {
  const s = speciesOf(avatar)
  const stroke = 'rgba(0,0,0,0.14)'
  const hat = equippedEmoji(equip, 'hat')
  const face = equippedEmoji(equip, 'face')
  const hand = equippedEmoji(equip, 'hand')
  const cape = equippedEmoji(equip, 'cape')

  return (
    <div className={`character ${className}`}>
      {cape && <span className="ovl ovl-cape">{cape}</span>}
      <svg viewBox="0 0 120 150" className="character-svg">
        <Tail s={s} />
        {/* 다리 */}
        <ellipse cx="48" cy="130" rx="11" ry="10" fill={s.main} stroke={stroke} />
        <ellipse cx="72" cy="130" rx="11" ry="10" fill={s.main} stroke={stroke} />
        {/* 몸통 */}
        <path d="M34,92 q26,-20 52,0 q6,28 -6,40 q-20,12 -40,0 q-12,-12 -6,-40 z" fill={s.main} stroke={stroke} />
        <ellipse cx="60" cy="112" rx="18" ry="22" fill={s.belly} opacity="0.9" />
        {/* 팔 */}
        <ellipse cx="30" cy="104" rx="9" ry="13" fill={s.main} stroke={stroke} transform="rotate(18 30 104)" />
        <ellipse cx="90" cy="104" rx="9" ry="13" fill={s.main} stroke={stroke} transform="rotate(-18 90 104)" />
        {/* 머리 */}
        <Ears s={s} />
        <circle cx="60" cy="54" r="36" fill={s.main} stroke={stroke} />
        <ellipse cx="60" cy="64" rx="24" ry="20" fill={s.belly} opacity="0.55" />
        {/* 눈 */}
        <circle cx="48" cy="52" r="5" fill="#2a2a30" />
        <circle cx="72" cy="52" r="5" fill="#2a2a30" />
        <circle cx="49.5" cy="50.5" r="1.6" fill="#fff" />
        <circle cx="73.5" cy="50.5" r="1.6" fill="#fff" />
        {/* 볼터치 */}
        <circle cx="40" cy="63" r="5" fill="#ffb3bd" opacity="0.7" />
        <circle cx="80" cy="63" r="5" fill="#ffb3bd" opacity="0.7" />
        {/* 코·입 / 부리 */}
        {s.beak ? (
          <polygon points="54,60 66,60 60,70" fill="#f2a13c" />
        ) : (
          <>
            <ellipse cx="60" cy="62" rx="3.5" ry="2.6" fill="#5b4636" />
            <path d="M60,64 q-6,7 -11,3 M60,64 q6,7 11,3" fill="none" stroke="#5b4636" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
      </svg>
      {hand && <span className="ovl ovl-hand">{hand}</span>}
      {face && <span className="ovl ovl-face">{face}</span>}
      {hat && <span className="ovl ovl-hat">{hat}</span>}
    </div>
  )
}
