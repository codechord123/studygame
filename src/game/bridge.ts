// React ↔ Phaser 통신 채널. 의존성 없는 초경량 이벤트 이미터.
// (여기서 Phaser 를 import 하면 메인 번들이 1MB+ 커지므로 절대 import 하지 않는다.)
//
// Phaser → React:
//   'phaser:ui'      { type }      시설 이용 → React 화면 열기
//   'phaser:villager'{ id }        주민에게 말 걸기 → 그 과목 학습
//   'phaser:harvest' { plotId, subject }  채집 시도 → 학습 미션
//   'phaser:exit'                  마을(이모지 버전)으로 나가기
//   'action'                       A 버튼 (상호작용)
// React → Phaser:
//   'react:reward'   { plotId, correct, total }  채집 결과 → 보상/리스폰

type Handler = { fn: (...args: unknown[]) => void; ctx?: unknown }

class Emitter {
  private map = new Map<string, Handler[]>()

  on(event: string, fn: (...args: never[]) => void, ctx?: unknown) {
    const list = this.map.get(event) ?? []
    list.push({ fn: fn as (...a: unknown[]) => void, ctx })
    this.map.set(event, list)
  }

  off(event: string, fn: (...args: never[]) => void, ctx?: unknown) {
    const list = this.map.get(event)
    if (!list) return
    const target = fn as unknown
    this.map.set(
      event,
      list.filter((h) => !(h.fn === target && (ctx === undefined || h.ctx === ctx))),
    )
  }

  emit(event: string, ...args: unknown[]) {
    const list = this.map.get(event)
    if (!list) return
    for (const h of [...list]) h.fn.apply(h.ctx, args)
  }
}

export const bridge = new Emitter()

// 이동 입력 (DOM D패드 ↔ Phaser). 키보드는 씬에서 직접 처리.
export const inputState = { dx: 0, dy: 0 }
