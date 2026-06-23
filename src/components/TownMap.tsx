import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  VILLAGERS,
  FURNITURE,
  houseInfo,
  timeOfDay,
  timeLabel,
  seasonOf,
  NPC_CHATTER,
  type Villager,
  type Classmate,
} from '../game/world'
import { store } from '../lib/storage'
import {
  loadLocalGuestbook,
  postLocalGuestbook,
  SEED_CHEERS,
  type GuestEntry,
} from '../game/guestbook'
import { playStep, playBlip, isMuted, setMuted } from '../lib/sfx'
import type { PlayMode } from './QuestionCard'

// 걸어다니는 마을 맵: 이동·상호작용·살아있는 NPC·낮밤/계절/축제·친구 집 방문.

const COLS = 13
const ROWS = 18
const TILE = 46
const STEP_MS = 140 // 한 칸 이동 간격(연속 이동 속도)

type Terrain = 'grass' | 'path' | 'water' | 'tree' | 'flower'
export type FacilityScreen = 'room' | 'shop' | 'missions' | 'ranking' | 'wrong' | 'ai' | 'dex'

interface StaticEntity {
  id: string
  kind: 'facility' | 'house' | 'myhouse'
  x: number
  y: number
  emoji: string
  name: string
  mate?: Classmate
  facility?: FacilityScreen
}
interface Npc {
  id: string
  villager: Villager
  x: number
  y: number
  home: [number, number]
}

interface Props {
  avatar: string
  hat?: string
  characterName: string
  houseStage: number
  mates: Classmate[]
  stars: number
  onStudy: (v: Villager, mode: PlayMode) => void
  onMake: (v: Villager) => void
  onOpen: (screen: FacilityScreen) => void
}

// ── 지형 ──────────────────────────────────────────────────────────
function buildTerrain(): Terrain[][] {
  const g: Terrain[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 'grass' as Terrain),
  )
  for (let x = 0; x < COLS; x++) {
    g[0][x] = 'tree'
    g[ROWS - 1][x] = 'tree'
  }
  for (let y = 0; y < ROWS; y++) {
    g[y][0] = 'tree'
    g[y][COLS - 1] = 'tree'
  }
  for (let y = 2; y <= 4; y++) for (let x = 4; x <= 6; x++) g[y][x] = 'water'
  for (let x = 1; x <= 11; x++) g[8][x] = 'path'
  for (let y = 1; y <= 16; y++) g[y][6] = g[y][6] === 'water' ? 'water' : 'path'
  const trees: [number, number][] = [[2, 2], [10, 2], [2, 6], [10, 6], [2, 10], [10, 10], [3, 16], [9, 16]]
  trees.forEach(([x, y]) => (g[y][x] = 'tree'))
  const flowers: [number, number][] = [[3, 9], [9, 9], [5, 12], [7, 12], [3, 7], [9, 7]]
  flowers.forEach(([x, y]) => (g[y][x] = 'flower'))
  return g
}
const TERRAIN = buildTerrain()
const blockedTerrain = (t: Terrain) => t === 'tree' || t === 'water'

const VILLAGER_POS: Record<string, [number, number]> = {
  math: [4, 6],
  korean: [8, 6],
  social: [4, 10],
  science: [8, 10],
}
const FACILITIES: { facility: FacilityScreen; emoji: string; name: string; x: number; y: number }[] = [
  { facility: 'shop', emoji: '🏪', name: '상점', x: 2, y: 8 },
  { facility: 'missions', emoji: '📋', name: '게시판', x: 10, y: 8 },
  { facility: 'ranking', emoji: '⭐', name: '명예의 별', x: 2, y: 12 },
  { facility: 'ai', emoji: '🏭', name: '문제공방', x: 10, y: 12 },
  { facility: 'wrong', emoji: '📕', name: '오답노트', x: 6, y: 4 },
  { facility: 'dex', emoji: '📜', name: '학습도감', x: 6, y: 12 },
]
const MY_HOUSE_POS: [number, number] = [6, 15]
const MATE_PLOTS: [number, number][] = [[2, 14], [4, 14], [8, 14], [10, 14], [2, 16], [4, 16], [8, 16], [10, 16]]
const SPAWN: [number, number] = [6, 13]
const LANTERNS: [number, number][] = [[3, 8], [9, 8], [6, 6], [6, 10], [6, 14]]
const FIREFLIES: [number, number][] = [[4, 12], [8, 12], [5, 5]]
const DECOR_SPOTS: [number, number][] = [[1, 5], [11, 5], [1, 13], [11, 13], [3, 2], [9, 2]]

type Dir = 'up' | 'down' | 'left' | 'right'
const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function TownMap({ avatar, hat, characterName, houseStage, mates, stars, onStudy, onMake, onOpen }: Props) {
  const [pos, setPos] = useState({ x: SPAWN[0], y: SPAWN[1] })
  const [face, setFace] = useState<'left' | 'right'>('right')
  const [moving, setMoving] = useState(false)
  const [npcs, setNpcs] = useState<Npc[]>(() =>
    VILLAGERS.map((v) => {
      const p = VILLAGER_POS[v.id]
      return { id: v.id, villager: v, x: p[0], y: p[1], home: p }
    }),
  )
  const [bubbles, setBubbles] = useState<Record<string, string>>({})
  const [activeVillager, setActiveVillager] = useState<Villager | null>(null)
  const [visit, setVisit] = useState<Classmate | null>(null)
  const [muted, setMutedState] = useState(isMuted())
  const viewportRef = useRef<HTMLDivElement>(null)
  const [vp, setVp] = useState({ w: 360, h: 460 })
  const heldRef = useRef<Dir[]>([])
  const lastStepRef = useRef(0)
  const posRef = useRef(pos)
  posRef.current = pos

  const time = timeOfDay(stars)
  const season = useMemo(() => seasonOf(new Date().getMonth() + 1), [])

  // 정적 엔티티(시설·집)
  const statics = useMemo<StaticEntity[]>(() => {
    const list: StaticEntity[] = []
    FACILITIES.forEach((f) => list.push({ id: 'f-' + f.facility, kind: 'facility', x: f.x, y: f.y, emoji: f.emoji, name: f.name, facility: f.facility }))
    list.push({ id: 'myhouse', kind: 'myhouse', x: MY_HOUSE_POS[0], y: MY_HOUSE_POS[1], emoji: houseInfo(houseStage).emoji, name: `${characterName}의 집`, facility: 'room' })
    mates.slice(0, MATE_PLOTS.length).forEach((m, i) => {
      const p = MATE_PLOTS[i]
      list.push({ id: 'h-' + i, kind: 'house', x: p[0], y: p[1], emoji: houseInfo(m.houseStage).emoji, name: m.name + '의 집', mate: m })
    })
    return list
  }, [mates, houseStage, characterName])

  const staticBlocked = useMemo(() => new Set(statics.map((e) => e.x + ',' + e.y)), [statics])

  // 뷰포트 크기
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => setVp({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isFree = useCallback(
    (x: number, y: number, npcList: Npc[]) => {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false
      if (blockedTerrain(TERRAIN[y][x])) return false
      if (staticBlocked.has(x + ',' + y)) return false
      if (npcList.some((n) => n.x === x && n.y === y)) return false
      return true
    },
    [staticBlocked],
  )

  // 플레이어 한 칸 이동
  const step = useCallback(() => {
    const held = heldRef.current
    if (held.length === 0) return
    const d = held[held.length - 1]
    const [dx, dy] = DELTA[d]
    if (d === 'left') setFace('left')
    else if (d === 'right') setFace('right')
    setPos((p) => {
      const nx = p.x + dx
      const ny = p.y + dy
      if (!isFree(nx, ny, npcs)) return p
      lastStepRef.current = performance.now()
      playStep()
      return { x: nx, y: ny }
    })
  }, [isFree, npcs])

  const pressDir = useCallback(
    (d: Dir) => {
      if (activeVillager || visit) return
      const held = heldRef.current
      if (!held.includes(d)) held.push(d)
      setMoving(true)
      if (performance.now() - lastStepRef.current >= STEP_MS) step()
    },
    [step, activeVillager, visit],
  )
  const releaseDir = useCallback((d: Dir) => {
    heldRef.current = heldRef.current.filter((x) => x !== d)
    if (heldRef.current.length === 0) setMoving(false)
  }, [])

  // 연속 이동 루프
  useEffect(() => {
    const t = setInterval(() => {
      if (heldRef.current.length && performance.now() - lastStepRef.current >= STEP_MS) step()
    }, 40)
    return () => clearInterval(t)
  }, [step])

  // 근처 상호작용 대상 (시설·집 + NPC), 바라보는 방향 우선
  const nearList = useMemo(() => {
    const npcEnt = npcs.map((n) => ({ id: 'v-' + n.id, kind: 'villager' as const, x: n.x, y: n.y, villager: n.villager, name: n.villager.name }))
    return [...statics, ...npcEnt]
  }, [statics, npcs])

  const near = useMemo(() => {
    const [fx, fy] = DELTA[face === 'left' ? 'left' : 'right']
    const front = nearList.find((e) => e.x === pos.x + fx && e.y === pos.y + fy)
    if (front) return front
    return nearList.find((e) => Math.abs(e.x - pos.x) + Math.abs(e.y - pos.y) === 1) ?? null
  }, [nearList, pos, face])

  const interact = useCallback(() => {
    if (!near) return
    playBlip()
    if ('villager' in near && near.villager) setActiveVillager(near.villager)
    else if ('mate' in near && near.mate) setVisit(near.mate)
    else if ('facility' in near && near.facility) onOpen(near.facility)
  }, [near, onOpen])

  // 키보드
  useEffect(() => {
    const dirOf = (k: string): Dir | null =>
      k === 'ArrowUp' || k === 'w' ? 'up' : k === 'ArrowDown' || k === 's' ? 'down' : k === 'ArrowLeft' || k === 'a' ? 'left' : k === 'ArrowRight' || k === 'd' ? 'right' : null
    const down = (e: KeyboardEvent) => {
      if (activeVillager || visit) {
        if (e.key === 'Escape') {
          setActiveVillager(null)
          setVisit(null)
        }
        return
      }
      const d = dirOf(e.key)
      if (d) {
        e.preventDefault()
        pressDir(d)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        interact()
      }
    }
    const up = (e: KeyboardEvent) => {
      const d = dirOf(e.key)
      if (d) releaseDir(d)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [pressDir, releaseDir, interact, activeVillager, visit])

  // NPC 배회 + 말풍선
  useEffect(() => {
    const t = setInterval(() => {
      setNpcs((prev) => {
        const occupied = new Set(prev.map((n) => n.x + ',' + n.y))
        return prev.map((n) => {
          if (Math.random() > 0.5) return n
          const dirs = Object.values(DELTA)
          const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)]
          const nx = n.x + dx
          const ny = n.y + dy
          const withinHome = Math.abs(nx - n.home[0]) + Math.abs(ny - n.home[1]) <= 2
          const blocked =
            !withinHome ||
            (nx === posRef.current.x && ny === posRef.current.y) ||
            occupied.has(nx + ',' + ny) ||
            nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= ROWS - 1 ||
            blockedTerrain(TERRAIN[ny][nx]) ||
            staticBlocked.has(nx + ',' + ny)
          if (blocked) return n
          occupied.delete(n.x + ',' + n.y)
          occupied.add(nx + ',' + ny)
          return { ...n, x: nx, y: ny }
        })
      })
      // 말풍선
      if (Math.random() < 0.4) {
        const v = VILLAGERS[Math.floor(Math.random() * VILLAGERS.length)]
        const lines = NPC_CHATTER[v.id] ?? []
        const text = lines[Math.floor(Math.random() * lines.length)]
        if (text) {
          setBubbles((b) => ({ ...b, [v.id]: text }))
          setTimeout(() => setBubbles((b) => { const c = { ...b }; delete c[v.id]; return c }), 2600)
        }
      }
    }, 1200)
    return () => clearInterval(t)
  }, [staticBlocked])

  // 카메라
  const worldW = COLS * TILE
  const worldH = ROWS * TILE
  const camX = worldW <= vp.w ? (vp.w - worldW) / 2 : -clamp(pos.x * TILE + TILE / 2 - vp.w / 2, 0, worldW - vp.w)
  const camY = worldH <= vp.h ? (vp.h - worldH) / 2 : -clamp(pos.y * TILE + TILE / 2 - vp.h / 2, 0, worldH - vp.h)

  const tiles = useMemo(
    () =>
      TERRAIN.map((row, y) =>
        row.map((t, x) => (
          <div key={x + '-' + y} className={`tile tile-${t}`} style={{ left: x * TILE, top: y * TILE, width: TILE, height: TILE }}>
            {t === 'tree' ? '🌲' : t === 'flower' ? '🌼' : ''}
          </div>
        )),
      ),
    [],
  )

  function toggleMute() {
    const m = !muted
    setMuted(m)
    setMutedState(m)
    if (!m) playBlip()
  }

  return (
    <main className="screen townmap">
      <div className="map-top">
        <h1 className="map-title">🌳 별숲 마을</h1>
        <div className="map-meta">
          <span className="time-chip">{timeLabel(time)}</span>
          <span className="time-chip">{season.decor[0]} {season.name}</span>
          <button className="mute-btn" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>

      <div className={`viewport time-${time}`} ref={viewportRef}>
        <div className="world" style={{ width: worldW, height: worldH, transform: `translate(${camX}px, ${camY}px)` }}>
          {tiles}

          {/* 시간대 틴트 (타일 위, 스프라이트 아래) */}
          <div className={`time-tint tint-${time}`} style={{ width: worldW, height: worldH }} />

          {/* 계절 장식 */}
          {DECOR_SPOTS.map(([x, y], i) => (
            <span key={'d' + i} className="decor" style={{ left: x * TILE, top: y * TILE, width: TILE, height: TILE }}>
              {season.decor[i % season.decor.length]}
            </span>
          ))}

          {/* 밤: 등불 + 반딧불 */}
          {time === 'night' && (
            <>
              {LANTERNS.map(([x, y], i) => (
                <span key={'l' + i} className="lantern" style={{ left: x * TILE, top: y * TILE, width: TILE, height: TILE }}>🏮</span>
              ))}
              {FIREFLIES.map(([x, y], i) => (
                <span key={'ff' + i} className="firefly" style={{ left: x * TILE, top: y * TILE }}>✨</span>
              ))}
            </>
          )}

          {/* 시설·집 */}
          {statics.map((e) => {
            const isNear = near?.id === e.id
            return (
              <div
                key={e.id}
                className={`sprite sprite-${e.kind} ${isNear ? 'near' : ''}`}
                style={{ left: e.x * TILE, top: e.y * TILE, width: TILE, height: TILE }}
                onClick={() => { playBlip(); if (e.mate) setVisit(e.mate); else if (e.facility) onOpen(e.facility) }}
              >
                <span className="sprite-emoji">{e.emoji}</span>
                <span className="sprite-tag">{e.kind === 'myhouse' ? '내 집' : e.name}</span>
              </div>
            )
          })}

          {/* NPC */}
          {npcs.map((n) => {
            const isNear = near?.id === 'v-' + n.id
            return (
              <div
                key={n.id}
                className={`sprite sprite-villager npc ${isNear ? 'near' : ''}`}
                style={{ left: n.x * TILE, top: n.y * TILE, width: TILE, height: TILE }}
                onClick={() => { playBlip(); setActiveVillager(n.villager) }}
              >
                {bubbles[n.id] && <span className="bubble">{bubbles[n.id]}</span>}
                <span className="sprite-emoji">{n.villager.emoji}</span>
                <span className="sprite-tag">{n.villager.name}</span>
              </div>
            )
          })}

          {/* 플레이어 */}
          <div className={`sprite player ${moving ? 'moving' : ''} face-${face}`} style={{ left: pos.x * TILE, top: pos.y * TILE, width: TILE, height: TILE }}>
            <span className="sprite-emoji">
              {hat && <span className="player-hat">{hat}</span>}
              {avatar}
            </span>
          </div>
        </div>

        {time === 'night' && <div className="festival-banner">🎉 별빛 축제가 열렸어요!</div>}

        {near && (
          <div className="near-banner">
            {'villager' in near && near.villager
              ? `${near.name}에게 말 걸기`
              : near.kind === 'myhouse'
                ? '내 집 들어가기'
                : near.kind === 'house'
                  ? `${near.name} 방문하기`
                  : `${near.name} 이용하기`}
          </div>
        )}
      </div>

      {/* 조작 */}
      <div className="controls">
        <div className="dpad">
          <button className="dbtn up" onPointerDown={() => pressDir('up')} onPointerUp={() => releaseDir('up')} onPointerLeave={() => releaseDir('up')}>▲</button>
          <button className="dbtn left" onPointerDown={() => pressDir('left')} onPointerUp={() => releaseDir('left')} onPointerLeave={() => releaseDir('left')}>◀</button>
          <button className="dbtn right" onPointerDown={() => pressDir('right')} onPointerUp={() => releaseDir('right')} onPointerLeave={() => releaseDir('right')}>▶</button>
          <button className="dbtn down" onPointerDown={() => pressDir('down')} onPointerUp={() => releaseDir('down')} onPointerLeave={() => releaseDir('down')}>▼</button>
        </div>
        <button className="abtn" disabled={!near} onClick={interact}>A</button>
      </div>

      {/* 주민 대화 */}
      {activeVillager && (
        <div className="modal-backdrop" onClick={() => setActiveVillager(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">{activeVillager.emoji}</div>
            <div className="modal-name">{activeVillager.name} <span className="modal-subject">· {activeVillager.subject}</span></div>
            <p className="modal-line">“{activeVillager.greeting}”</p>
            <button className="btn primary big" onClick={() => { const v = activeVillager; setActiveVillager(null); onStudy(v, 'study') }}>📖 같이 공부하기</button>
            <button className="btn challenge big" onClick={() => { const v = activeVillager; setActiveVillager(null); onStudy(v, 'challenge') }}>⚡ 도전 모드</button>
            <button className="btn accent big" onClick={() => { const v = activeVillager; setActiveVillager(null); onMake(v) }}>✏️ {activeVillager.subject} 문제 만들기</button>
            <button className="btn ghost big" onClick={() => setActiveVillager(null)}>닫기</button>
          </div>
        </div>
      )}

      {/* 친구 집 내부 방문 */}
      {visit && <HouseVisit mate={visit} myName={characterName} onClose={() => setVisit(null)} />}
    </main>
  )
}

// ── 친구 집 내부 + 방명록 ─────────────────────────────────────────
function HouseVisit({ mate, myName, onClose }: { mate: Classmate; myName: string; onClose: () => void }) {
  const ownerId = mate.id ?? mate.name
  const [entries, setEntries] = useState<GuestEntry[]>([])
  const [text, setText] = useState('')

  // 집 단계에 따라 가구를 생성 (많이 지을수록 풍성)
  const furniture = useMemo(() => {
    const n = Math.min(mate.houseStage + 1, FURNITURE.length)
    return FURNITURE.slice(0, n).map((f) => f.emoji)
  }, [mate.houseStage])

  useEffect(() => {
    let alive = true
    const local = loadLocalGuestbook(ownerId)
    setEntries(local.length ? local : SEED_CHEERS)
    if (store.loadGuestbook) {
      store.loadGuestbook(ownerId).then((d) => { if (alive && d.length) setEntries(d) }).catch(() => {})
    }
    return () => { alive = false }
  }, [ownerId])

  async function post() {
    const t = text.trim()
    if (!t) return
    const entry: GuestEntry = { from: myName || '이웃', text: t, at: Date.now() }
    setEntries((e) => [entry, ...e])
    setText('')
    postLocalGuestbook(ownerId, entry)
    if (store.postGuestbook) await store.postGuestbook(ownerId, entry).catch(() => {})
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal visit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-name">{mate.avatar} {mate.name}의 집</div>
        <p className="modal-line">딩동— {houseInfo(mate.houseStage).name}에 놀러 왔어요!</p>

        <div className="interior">
          <div className="interior-furni">
            {furniture.map((f, i) => <span key={i} className="furni">{f}</span>)}
          </div>
          <div className="interior-host">{mate.avatar}</div>
        </div>
        <p className="visit-stat">경험치 {mate.xp} · {houseInfo(mate.houseStage).emoji} {houseInfo(mate.houseStage).name}</p>

        <div className="guestbook">
          <div className="gb-title">📖 방명록</div>
          <div className="gb-input">
            <input
              className="hint-input"
              maxLength={80}
              value={text}
              placeholder="응원을 남겨요!"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && post()}
            />
            <button className="btn primary" onClick={post}>남기기</button>
          </div>
          <ul className="gb-list">
            {entries.map((g, i) => (
              <li key={i} className="gb-entry"><b>{g.from}</b> {g.text}</li>
            ))}
          </ul>
        </div>

        <button className="btn ghost big" onClick={onClose}>나가기</button>
      </div>
    </div>
  )
}
