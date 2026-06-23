import './StatusBar.css'

interface Props {
  state: string
  message: string
  audioLevel: number
  onSettingsClick: () => void
  onVoiceToggle: () => void
  isRecording?: boolean
}

const STATE_COLORS: Record<string, string> = {
  idle: '#888',
  listening: '#44ccff',
  thinking: '#ffcc44',
  talking: '#44cc66',
}

export function StatusBar({ state, message, audioLevel, onSettingsClick, onVoiceToggle, isRecording }: Props) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-indicator" style={{ background: STATE_COLORS[state] || '#888' }} />
        <span className="status-message">{message}</span>
        {isRecording && (
          <span className="recording-badge">● Gravando</span>
        )}
      </div>

      <div className="status-right">
        <button className="tool-btn" onClick={onVoiceToggle} title="Gravar voz (V)">
          {isRecording ? '⏹' : '🎤'}
        </button>
        <button className="tool-btn" onClick={onSettingsClick} title="Configurações (F1)">
          ⚙
        </button>
      </div>
    </div>
  )
}
