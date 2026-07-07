import { Component, ReactNode } from 'react'

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#0d0d14',
          color: '#ff6666', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          fontFamily: 'monospace', padding: 32,
        }}>
          <div style={{ fontSize: 32 }}>&#x26A0;&#xFE0F;</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#ffaaaa' }}>
            Erro ao iniciar o aplicativo
          </div>
          <div style={{
            maxWidth: 600, fontSize: 12, color: '#cc4444',
            background: '#1a0a0a', padding: 16, borderRadius: 8,
            border: '1px solid #440000', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack?.split('\n').slice(0, 6).join('\n')}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px', background: '#4488ff',
              border: 'none', borderRadius: 6, color: '#fff',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            Reiniciar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
