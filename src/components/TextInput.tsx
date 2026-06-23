import { useState, useRef } from 'react'
import './TextInput.css'

interface Props {
  onSubmit: (text: string) => void
  disabled: boolean
}

export function TextInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div className="text-input-row">
      <input
        ref={inputRef}
        className="text-field"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
        placeholder="Digite aqui..."
        disabled={disabled}
      />
      <button className="send-btn" onClick={handleSubmit} disabled={disabled || !value.trim()}>
        Enviar
      </button>
    </div>
  )
}
