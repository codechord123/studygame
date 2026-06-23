import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { VILLAGERS, houseInfo, type Villager, type Classmate } from '../game/world'
import type { PlayMode } from './QuestionCard'

// 걸어다니는 마을 맵: 아바타를 방향키/D패드로 움직여 주민에게 말 걸고
// 시설을 이용하고 친구 집을 방문한다. (카메라가 플레이어를 따라간다)

const COLS = 13
const ROWS = 18
const TILE = 46

type Terrain = 'grass' | 'path' | 'water' | 'tree' | 'flower'

export type FacilityScreen = 'room' | 'shop' | 'missions' | 'ranking' | 'wrong' | 'ai'

interface Entity {
  id: string
  kind: 'villager' | 'facility' | 'house' | 'myhouse'
  x: number
  y: number
  emoji: string
  name: string
  sub?: string
  villager?: Villager
  mate?: Classmate
  facility?: FacilityScreen
}

interface Props {
  avatar: string
  hat?: string
  characterName: string
  houseStage: number
  mates: Classmate[]
  onStudy: (v: Villager, mode: PlayMode) => void
  onMake: (v: Villager) => void
  onOpen: (screen: FacilityScreen) => void
}

// ── 지형 생성 ─────────────────────────────────────────────────────
function buildTerrain(): Terrain[][] {
  const g: Terrain[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 'grass' as Terrain),
  )
  // 테두리 나무
  for (let x = 0; x < COLS; x++) {
    g[0][x] = 'tree'
    g[ROWS - 1][x] = 'tree'
  }
  for (let y = 0; y < ROWS; y++) {
    g[y][0] = 'tree'
    g[y][COLS - 1] = 'tree'
  }
  // 연못
  for (let y = 2; y <= 4; y++) for (let x = 4; x <= 6; x++) g[y][x] = 'water'
  // 길 (장식, 통행 가능)
  for (let x = 1; x <= 11; x++) g[8][x] = 'path'
  for (let y = 1; y <= 16; y++) g[y][6] = g[y][6] === 'water' ? 'water' : 'path'
  // 장식 나무
  const trees: [number, number][] = [
    [2, 2],
    [10, 2],
    [2, 6],
    [10, 6],
    [2, 10],
    [10, 10],
    [3, 16],
    [9, 16],
  ]
  trees.forEach(([x, y]) => (g[y][x] = 'tree'))
  // 꽃
  const flowers: [number, number][] = [
    [3, 9],
    [9, 9],
    [5, 12],
    [7, 12],
    [3, 7],
    [9, 7],
  ]
  flowers.forEach(([x, y]) => (g[y][x] = 'flower'))
  return g
}

const TERRAIN = buildTerrain()
const blockedTerrain = (t: Terrain) => t === 'tree' || t === 'water'

// 주민·시설·집 배치 좌표
const VILLAGER_POS: Record<string, [number, number]> = {
  math: [4, 6],
  korean: [8, 6],
  social: [4, 10],
  science: [8, 10],
}
const FACILITIES: { facility: FacilityScreen; emoji: string; name: string; x: number; y: number }[] =
  [
    { facility: 'shop', emoji: '🏪', name: '상점', x: 2, y: 8 },
    { facility: 'missions', emoji: '📋', name: '게시판', x: 10, y: 8 },
    { facility: 'ranking', emoji: '⭐', name: '명예의 별', x: 2, y: 12 },
    { facility: 'ai', emoji: '🏭', name: '문제공방', x: 10, y: 12 },
    { facility: 'wrong', emoji: '📕', name: '오답노트', x: 6, y: 4 },
  ]
const MY_HOUSE_POS: [number, number] = [6, 15]
const MATE_PLOTS: [number, number][] = [
  [2, 14],
  [4, 14],
  [8, 14],
  [10, 14],
  [2, 16],
  [4, 16],
  [8, 16],
  [10, 16],
]
const SPAWN: [number, number] = [6, 13]

type Dir = 'up' | 'down' | 'left' | 'right'
const DELTA: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function TownMap({
  avatar,
  hat,
  characterName,
  houseStage,
  mates,
  onStudy,
  onMake,
  onOpen,
}: Props) {
  const [pos, setPos] = useState({ x: SPAWN[0], y: SPAWN[1] })
  const [dir, setDir] = useState<Dir>('down')
  const [activeVillager, setActiveVillager] = useState<Villager | null>(null)
  const [visit, setVisit] = useState<Entity | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [vp, setVp] = useState({ w: 360, h: 460 })

  // 엔티티 구성
  const entities = useMemo<Entity[]>(() => {
    const list: Entity[] = []
    VILLAGERS.forEach((v) => {
      const p = VILLAGER_POS[v.id]
      if (p) list.push({ id: 'v-' + v.id, kind: 'villager', x: p[0], y: p[1], emoji: v.emoji, name: v.name, sub: v.subject, villager: v })
    })
    FACILITIES.forEach((f) =>
      list.push({ id: 'f-' + f.facility, kind: 'facility', x: f.x, y: f.y, emoji: f.emoji, name: f.name, facility: f.facility }),
    )
    list.push({
      id: 'myhouse',
      kind: 'myhouse',
      x: MY_HOUSE_POS[0],
      y: MY_HOUSE_POS[1],
      emoji: houseInfo(houseStage).emoji,
      name: `${characterName}의 집`,
      facility: 'room',
    })
    mates.slice(0, MATE_PLOTS.length).forEach((m, i) => {
      const p = MATE_PLOTS[i]
      list.push({ id: 'h-' + i, kind: 'house', x: p[0], y: p[1], emoji: houseInfo(m.houseStage).emoji, name: m.name + '의 집', mate: m })
    })
    return list
  }, [mates, houseStage, characterName])

  const blockedSet = useMemo(() => {
    const s = new Set<string>()
    entities.forEach((e) => s.add(e.x + ',' + e.y))
    return s
  }, [entities])

  // 뷰포트 크기 추적
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => setVp({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const move = useCallback(
    (d: Dir) => {
      setDir(d)
      setPos((p) => {
        const [dx, dy] = DELTA[d]
        const nx = p.x + dx
        const ny = p.y + dy
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return p
        if (blockedTerrain(TERRAIN[ny][nx])) return p
        if (blockedSet.has(nx + ',' + ny)) return p
        return { x: nx, y: ny }
      })
    },
    [blockedSet],
  )

  // 근처(인접) 상호작용 대상 — 바라보는 방향 우선
  const nearEntity = useMemo<Entity | null>(() => {
    const [fdx, fdy] = DELTA[dir]
    const front = entities.find((e) => e.x === pos.x + fdx && e.y === pos.y + fdy)
    if (front) return front
    return (
      entities.find((e) => Math.abs(e.x - pos.x) + Math.abs(e.y - pos.y) === 1) ?? null
    )
  }, [entities, pos, dir])

  const interact = useCallback(() => {
    const e = nearEntity
    if (!e) return
    if (e.kind === 'villager' && e.villager) setActiveVillager(e.villager)
    else if (e.kind === 'house') setVisit(e)
    else if (e.facility) onOpen(e.facility)
  }, [nearEntity, onOpen])

  // 키보드
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key
      if (activeVillager || visit) {
        if (k === 'Escape') {
          setActiveVillager(null)
          setVisit(null)
        }
        return
      }
      if (k === 'ArrowUp' || k === 'w') (e.preventDefault(), move('up'))
      else if (k === 'ArrowDown' || k === 's') (e.preventDefault(), move('down'))
      else if (k === 'ArrowLeft' || k === 'a') (e.preventDefault(), move('left'))
      else if (k === 'ArrowRight' || k === 'd') (e.preventDefault(), move('right'))
      else if (k === ' ' || k === 'Enter') (e.preventDefault(), interact())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, interact, activeVillager, visit])

  // 카메라: 플레이어를 화면 중앙에 (지도 경계 안에서)
  const worldW = COLS * TILE
  const worldH = ROWS * TILE
  const camX =
    worldW <= vp.w ? (vp.w - worldW) / 2 : -clamp(pos.x * TILE + TILE / 2 - vp.w / 2, 0, worldW - vp.w)
  const camY =
    worldH <= vp.h ? (vp.h - worldH) / 2 : -clamp(pos.y * TILE + TILE / 2 - vp.h / 2, 0, worldH - vp.h)

  // 지형 레이어 (고정 → 메모)
  const tiles = useMemo(
    () =>
      TERRAIN.map((row, y) =>
        row.map((t, x) => (
          <div
            key={x + '-' + y}
            className={`tile tile-${t}`}
            style={{ left: x * TILE, top: y * TILE, width: TILE, height: TILE }}
          >
            {t === 'tree' ? '🌲' : t === 'flower' ? '🌼' : ''}
          </div>
        )),
      ),
    [],
  )

  return (
    <main className="screen townmap">
      <div className="map-top">
        <h1 className="map-title">🌳 별숲 마을</h1>
        <span className="map-hint">방향키·D패드로 이동, A로 말 걸기</span>
      </div>

      <div className="viewport" ref={viewportRef}>
        <div
          className="world"
          style={{
            width: worldW,
            height: worldH,
            transform: `translate(${camX}px, ${camY}px)`,
          }}
        >
          {tiles}

          {entities.map((e) => {
            const near = nearEntity?.id === e.id
            return (
              <div
                key={e.id}
                className={`sprite sprite-${e.kind} ${near ? 'near' : ''}`}
                style={{ left: e.x * TILE, top: e.y * TILE, width: TILE, height: TILE }}
                onClick={() => {
                  if (e.kind === 'villager' && e.villager) setActiveVillager(e.villager)
                  else if (e.kind === 'house') setVisit(e)
                  else if (e.facility) onOpen(e.facility)
                }}
              >
                <span className="sprite-emoji">{e.emoji}</span>
                <span className="sprite-tag">{e.kind === 'myhouse' ? '내 집' : e.name}</span>
              </div>
            )
          })}

          {/* 플레이어 */}
          <div
            className="sprite player"
            style={{ left: pos.x * TILE, top: pos.y * TILE, width: TILE, height: TILE }}
          >
            <span className="sprite-emoji">
              {hat && <span className="player-hat">{hat}</span>}
              {avatar}
            </span>
          </div>
        </div>

        {/* 근처 안내 */}
        {nearEntity && (
          <div className="near-banner">
            {nearEntity.kind === 'villager'
              ? `${nearEntity.name}에게 말 걸기`
              : nearEntity.kind === 'myhouse'
                ? '내 집 들어가기'
                : nearEntity.kind === 'house'
                  ? `${nearEntity.name} 방문하기`
                  : `${nearEntity.name} 이용하기`}
          </div>
        )}
      </div>

      {/* 조작 패드 */}
      <div className="controls">
        <div className="dpad">
          <button className="dbtn up" onClick={() => move('up')}>
            ▲
          </button>
          <button className="dbtn left" onClick={() => move('left')}>
            ◀
          </button>
          <button className="dbtn right" onClick={() => move('right')}>
            ▶
          </button>
          <button className="dbtn down" onClick={() => move('down')}>
            ▼
          </button>
        </div>
        <button className="abtn" disabled={!nearEntity} onClick={interact}>
          A
        </button>
      </div>

      {/* 주민 대화 */}
      {activeVillager && (
        <div className="modal-backdrop" onClick={() => setActiveVillager(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-emoji">{activeVillager.emoji}</div>
            <div className="modal-name">
              {activeVillager.name} <span className="modal-subject">· {activeVillager.subject}</span>
            </div>
            <p className="modal-line">“{activeVillager.greeting}”</p>
            <button
              className="btn primary big"
              onClick={() => {
                const v = activeVillager
                setActiveVillager(null)
                onStudy(v, 'study')
              }}
            >
              📖 같이 공부하기
            </button>
            <button
              className="btn challenge big"
              onClick={() => {
                const v = activeVillager
                setActiveVillager(null)
                onStudy(v, 'challenge')
              }}
            >
              ⚡ 도전 모드
            </button>
            <button
              className="btn accent big"
              onClick={() => {
                const v = activeVillager
                setActiveVillager(null)
                onMake(v)
              }}
            >
              🤖 {activeVillager.subject} 문제 더 만들기
            </button>
            <button className="btn ghost big" onClick={() => setActiveVillager(null)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 친구 집 방문 */}
      {visit && visit.mate && (
        <div className="modal-backdrop" onClick={() => setVisit(null)}>
          <div className="modal visit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="visit-house">{houseInfo(visit.mate.houseStage).emoji}</div>
            <div className="modal-name">
              {visit.mate.avatar} {visit.mate.name}
            </div>
            <p className="modal-line">
              딩동— {visit.mate.name}의 {houseInfo(visit.mate.houseStage).name}에 놀러 왔어요!
            </p>
            <div className="visit-room">
              <span className="visit-floor">
                {visit.mate.avatar}
                <span className="visit-sofa">🛋️</span>
                <span className="visit-plant">🪴</span>
              </span>
            </div>
            <p className="visit-stat">경험치 {visit.mate.xp} · 함께 별을 모아요 ✨</p>
            <button className="btn ghost big" onClick={() => setVisit(null)}>
              나가기
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
