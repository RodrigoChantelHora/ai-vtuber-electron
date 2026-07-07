import { useEffect, useRef, useState } from 'react'
import { getLogs, clearLogs, type LogEntry } from '../services/LogService'
import './LogPanel.css'

interface Props {
  onClose: () => void
}

export function LogPanel({ onClose }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [logPath, setLogPath] = useState<string>('')
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEntries(getLogs())
    window.electronAPI?.getLogPath?.().then((p) => setLogPath(p ?? ''))
  }, [])

  // Scroll to bottom on open
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [entries])

  function handleClear() {
    clearLogs()
    window.electronAPI?.clearLogFile?.()
    setEntries([])
  }

  function fmt(ts: Date): string {
    return ts.toTimeString().slice(0, 8)
  }

  return (
    <div className="log-panel-overlay" onClick={onClose}>
      <div className="log-panel" onClick={(e) => e.stopPropagation()}>
        <div className="log-panel-header">
          <span className="log-panel-title">📋 Logs</span>
          <div className="log-panel-actions">
            <button className="log-btn danger" onClick={handleClear}>Limpar</button>
            <button className="log-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="log-body" ref={bodyRef}>
          {entries.length === 0
            ? <div className="log-empty">Sem logs ainda</div>
            : entries.map((e, i) => (
                <div key={i} className={`log-entry ${e.level}`}>
                  <span className="log-ts">{fmt(e.ts)}</span>
                  <span className="log-lvl">{e.level.toUpperCase()}</span>
                  <span className="log-msg">{e.message}</span>
                </div>
              ))
          }
        </div>

        {logPath && (
          <div className="log-path-bar" title={logPath}>
            💾 {logPath}
          </div>
        )}
      </div>
    </div>
  )
}
