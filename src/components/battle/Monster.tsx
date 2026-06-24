// 배틀용 SVG 몬스터 — HP 비율에 따라 색·표정이 바뀌고(평온→격노),
// 숨쉬기/눈깜빡임/피격/공격/처치 상태를 CSS 애니메이션으로 표현한다.
export type MonsterMood = 'idle' | 'hurt' | 'attack' | 'charge' | 'dead'

interface Props {
  hpRatio: number // 0~1
  mood: MonsterMood
}

interface Look {
  body: string
  bodyDark: string
  brow: string // 눈썹 path
  mouth: string // 입 path
  mouthFill: string
}

function lookFor(hpRatio: number, mood: MonsterMood): Look {
  // 페이즈: 체력이 줄수록 붉고 사나워진다
  const phase = hpRatio > 0.6 ? 0 : hpRatio > 0.3 ? 1 : 2
  const palette = [
    { body: '#8b6cff', bodyDark: '#5a3fd6' }, // 평온(보라)
    { body: '#ff8a3d', bodyDark: '#d6601a' }, // 분노(주황)
    { body: '#ff4d5e', bodyDark: '#c92438' }, // 격노(빨강)
  ][phase]

  // 표정
  let brow: string
  let mouth: string
  if (mood === 'hurt') {
    brow = 'M62,92 L92,98 M138,92 L108,98' // 찡그림
    mouth = 'M86,150 Q100,142 114,150' // 작게 찌푸린 입
  } else if (mood === 'attack' || mood === 'charge') {
    brow = 'M60,98 L94,86 M140,98 L106,86' // 매섭게 치켜
    mouth = 'M78,144 Q100,176 122,144 Q100,158 78,144' // 크게 벌린 입
  } else {
    // idle — 페이즈가 오를수록 사나운 눈썹
    brow = phase === 0
      ? 'M62,90 L92,90 M138,90 L108,90'
      : phase === 1
        ? 'M62,94 L92,86 M138,94 L108,86'
        : 'M58,98 L94,84 M142,98 L106,84'
    mouth = phase === 2
      ? 'M80,150 Q100,168 120,150 Q100,158 80,150' // 으르렁
      : 'M84,150 Q100,160 116,150' // 무표정 살짝 웃음
  }
  return { ...palette, brow, mouth, mouthFill: mood === 'attack' || mood === 'charge' || phase === 2 ? '#3a0a12' : 'none' }
}

export function Monster({ hpRatio, mood }: Props) {
  const L = lookFor(hpRatio, mood)
  return (
    <svg className={`monster mood-${mood}`} viewBox="0 0 200 210" width="170" height="178" aria-hidden>
      <defs>
        <radialGradient id="mbody" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor={L.body} />
          <stop offset="100%" stopColor={L.bodyDark} />
        </radialGradient>
        <radialGradient id="mbelly" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* 그림자 */}
      <ellipse className="mon-shadow" cx="100" cy="196" rx="58" ry="12" />

      {/* 몸 전체(숨쉬기 애니메이션 대상) */}
      <g className="mon-body">
        {/* 뿔 */}
        <path className="mon-horn" d="M70,52 L58,14 L92,44 Z" fill={L.bodyDark} />
        <path className="mon-horn" d="M130,52 L142,14 L108,44 Z" fill={L.bodyDark} />

        {/* 몸통 */}
        <path
          d="M38,122 C38,68 70,40 100,40 C130,40 162,68 162,122 C162,168 132,184 100,184 C68,184 38,168 38,122 Z"
          fill="url(#mbody)"
          stroke={L.bodyDark}
          strokeWidth="3"
        />
        {/* 배 하이라이트 */}
        <ellipse cx="100" cy="128" rx="46" ry="40" fill="url(#mbelly)" />

        {/* 눈 (깜빡임) */}
        <g className="mon-eyes">
          <ellipse cx="80" cy="108" rx="19" ry="23" fill="#fff" />
          <ellipse cx="120" cy="108" rx="19" ry="23" fill="#fff" />
          <g className="mon-pupils">
            <circle cx="82" cy="112" r="9" fill="#1a1430" />
            <circle cx="118" cy="112" r="9" fill="#1a1430" />
            <circle cx="85" cy="108" r="3.2" fill="#fff" />
            <circle cx="121" cy="108" r="3.2" fill="#fff" />
          </g>
        </g>

        {/* 눈썹 */}
        <path className="mon-brow" d={L.brow} stroke={L.bodyDark} strokeWidth="6" strokeLinecap="round" fill="none" />

        {/* 입 */}
        <path className="mon-mouth" d={L.mouth} stroke="#3a0a12" strokeWidth="4" strokeLinecap="round" fill={L.mouthFill} />
      </g>
    </svg>
  )
}
