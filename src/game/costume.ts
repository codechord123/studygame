// 캐릭터 코스튬: 슬롯별 아이템. 레벨로 해금되고 포인트(벨)로 구매한다.

export type Slot = 'hat' | 'face' | 'hand' | 'cape'
export const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'hat', label: '머리' },
  { slot: 'face', label: '얼굴' },
  { slot: 'hand', label: '손' },
  { slot: 'cape', label: '등' },
]

export interface CostumeItem {
  id: string
  slot: Slot
  emoji: string
  name: string
  minLevel: number // 이 레벨부터 구매 가능
  price: number // 벨
}

// 레벨이 오를수록 더 화려한 코스튬이 열린다.
export const COSTUMES: CostumeItem[] = [
  { id: 'flower', slot: 'hat', emoji: '🌸', name: '꽃', minLevel: 1, price: 40 },
  { id: 'bow', slot: 'hat', emoji: '🎀', name: '리본', minLevel: 1, price: 50 },
  { id: 'party', slot: 'hat', emoji: '🎉', name: '파티모자', minLevel: 2, price: 90 },
  { id: 'crown', slot: 'hat', emoji: '👑', name: '왕관', minLevel: 4, price: 140 },
  { id: 'wizard', slot: 'hat', emoji: '🧙', name: '마법사 모자', minLevel: 5, price: 180 },
  { id: 'halo', slot: 'hat', emoji: '😇', name: '천사 고리', minLevel: 7, price: 260 },

  { id: 'glasses', slot: 'face', emoji: '🕶️', name: '선글라스', minLevel: 1, price: 60 },
  { id: 'star', slot: 'face', emoji: '🤩', name: '반짝이 눈', minLevel: 3, price: 120 },
  { id: 'mask', slot: 'face', emoji: '🎭', name: '가면', minLevel: 5, price: 160 },

  { id: 'wand', slot: 'hand', emoji: '🪄', name: '요술봉', minLevel: 3, price: 110 },
  { id: 'balloon', slot: 'hand', emoji: '🎈', name: '풍선', minLevel: 2, price: 80 },
  { id: 'sword', slot: 'hand', emoji: '⚔️', name: '용사검', minLevel: 6, price: 200 },

  { id: 'cape', slot: 'cape', emoji: '🧣', name: '목도리', minLevel: 2, price: 90 },
  { id: 'backpack', slot: 'cape', emoji: '🎒', name: '가방', minLevel: 4, price: 130 },
  { id: 'wings', slot: 'cape', emoji: '🪽', name: '날개', minLevel: 8, price: 320 },
]

export function costumeById(id?: string | null): CostumeItem | undefined {
  return id ? COSTUMES.find((c) => c.id === id) : undefined
}
export function itemsForSlot(slot: Slot): CostumeItem[] {
  return COSTUMES.filter((c) => c.slot === slot)
}
export function isUnlocked(item: CostumeItem, level: number): boolean {
  return level >= item.minLevel
}
/** 슬롯에 착용된 아이템 이모지 */
export function equippedEmoji(equip: Record<string, string>, slot: Slot): string | undefined {
  return costumeById(equip[slot])?.emoji
}
