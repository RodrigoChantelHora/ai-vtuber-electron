// NeedsSystem.ts
// Controla fome, sede e cansaco com intervalos realistas
// Fome: ~3h | Sede: ~2h | Sono: ~6h

export type NeedType = 'hunger' | 'thirst' | 'tired'

export interface NeedConfig {
  hungerMs?: number
  thirstMs?: number
  tiredMs?:  number
}

export interface NeedInfo {
  title: string
  body:  string
  emoji: string
}

export const NEED_LABELS: Record<NeedType, NeedInfo> = {
  hunger: {
    title: 'Estou com fome!',
    body:  'Nao como ha muito tempo. Que tal me alimentar?',
    emoji: '🥪',
  },
  thirst: {
    title: 'Estou com sede!',
    body:  'Precisando de agua. Lembre-se de me dar algo para beber!',
    emoji: '💧',
  },
  tired: {
    title: 'Estou com sono...',
    body:  'Ja faz muito tempo acordada. Hora de dormir um pouquinho?',
    emoji: '😴',
  },
}

export class NeedsSystem {
  private timers: Partial<Record<NeedType, ReturnType<typeof setTimeout>>> = {}
  private intervals: Record<NeedType, number>
  private onNeedCb?: (type: NeedType, info: NeedInfo) => void
  private running = false

  constructor(cfg?: NeedConfig) {
    this.intervals = {
      hunger: cfg?.hungerMs ?? 3 * 60 * 60 * 1000,   // 3h
      thirst: cfg?.thirstMs ?? 2 * 60 * 60 * 1000,   // 2h
      tired:  cfg?.tiredMs  ?? 6 * 60 * 60 * 1000,   // 6h
    }
  }

  start(onNeed: (type: NeedType, info: NeedInfo) => void) {
    this.onNeedCb = onNeed
    this.running = true
    this.schedule('hunger')
    this.schedule('thirst')
    this.schedule('tired')
  }

  stop() {
    this.running = false
    for (const k in this.timers) clearTimeout(this.timers[k as NeedType])
    this.timers = {}
  }

  // Chame apos satisfazer a necessidade para reiniciar o ciclo
  satisfy(type: NeedType) {
    if (!this.running) return
    clearTimeout(this.timers[type])
    this.schedule(type)
  }

  private schedule(type: NeedType) {
    this.timers[type] = setTimeout(() => {
      this.onNeedCb?.(type, NEED_LABELS[type])
      this.schedule(type)
    }, this.intervals[type])
  }
}
