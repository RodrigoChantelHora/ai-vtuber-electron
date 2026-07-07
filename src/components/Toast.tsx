import { useEffect, useState } from 'react'
import './Toast.css'

export type ToastLevel = 'info' | 'warn' | 'error' | 'success'

export interface ToastItem {
  id: number
  message: string
  level: ToastLevel
}

const ICONS: Record<ToastLevel, string> = {
  info:    'i',
  warn:    '!',
  error:   'x',
  success: 'v',
}

const DURATIONS: Record<ToastLevel, number> = {
  info:    3000,
  warn:    4000,
  error:   6000,
  success: 3000,
}

interface SingleToastProps {
  item: ToastItem
  onDone: (id: number) => void
}

function SingleToast({ item, onDone }: SingleToastProps) {
  const [visible, setVisible] = useState(false)
  const duration = DURATIONS[item.level]

  useEffect(() => {
    setVisible(true)
    const t1 = setTimeout(() => setVisible(false), duration - 300)
    const t2 = setTimeout(() => onDone(item.id), duration)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [item.id, duration, onDone])

  return (
    <div className={`toast ${item.level} ${visible ? 'visible' : 'hidden'}`}>
      <span className="toast-icon">{ICONS[item.level]}</span>
      <span>{item.message}</span>
    </div>
  )
}

export function ToastContainer({ items, onDone }: { items: ToastItem[]; onDone: (id: number) => void }) {
  if (items.length === 0) return null
  return (
    <div className="toast-container">
      {items.map((item) => (
        <SingleToast key={item.id} item={item} onDone={onDone} />
      ))}
    </div>
  )
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(true)
    const t1 = setTimeout(() => setVisible(false), 2800)
    const t2 = setTimeout(onDone, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])
  return (
    <div className="toast-container">
      <div className={`toast info ${visible ? 'visible' : 'hidden'}`}>
        <span className="toast-icon">{ICONS.info}</span>
        <span>{message}</span>
      </div>
    </div>
  )
}
