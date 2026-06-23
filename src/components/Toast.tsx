import { useEffect, useState } from 'react'
import './Toast.css'

interface Props {
  message: string
  onDone: () => void
}

export function Toast({ message, onDone }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const t1 = setTimeout(() => setVisible(false), 2800)
    const t2 = setTimeout(onDone, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div className={`toast ${visible ? 'visible' : 'hidden'}`}>
      {message}
    </div>
  )
}
