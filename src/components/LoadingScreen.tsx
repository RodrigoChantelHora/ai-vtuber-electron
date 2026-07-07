import { useEffect, useState } from 'react'
import './LoadingScreen.css'

interface Props {
  progress: number
  message: string
  visible: boolean
}

export function LoadingScreen({ progress, message, visible }: Props) {
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    if (!visible) {
      // Aguarda o fade-out antes de desmontar
      const t = setTimeout(() => setMounted(false), 550)
      return () => clearTimeout(t)
    }
    setMounted(true)
  }, [visible])

  if (!mounted) return null

  return (
    <div
      className="loading-screen"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.45s ease',
        // NUNCA bloqueia eventos do mouse — o app fica interagível mesmo durante o fade
        pointerEvents: 'none',
      }}
    >
      <div className="loading-inner">
        <div className="loading-logo">
          <span className="loading-logo-icon">&#x1F916;</span>
          <span className="loading-logo-text">AI Vtuber</span>
        </div>

        <div className="loading-bar-wrap">
          <div
            className="loading-bar-fill"
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>

        <p className="loading-msg">{message}</p>
        <p className="loading-pct">{progress}%</p>
      </div>
    </div>
  )
}
