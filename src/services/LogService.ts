export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  ts: Date
  level: LogLevel
  message: string
}

const entries: LogEntry[] = []
const MAX_ENTRIES = 500

export function log(level: LogLevel, message: string): void {
  const entry: LogEntry = { ts: new Date(), level, message }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()

  const line = `[${entry.ts.toISOString()}] [${level.toUpperCase()}] ${message}`
  window.electronAPI?.appendLog?.(line)
}

export const logInfo  = (msg: string) => log('info',  msg)
export const logWarn  = (msg: string) => log('warn',  msg)
export const logError = (msg: string) => log('error', msg)

export function getLogs(): LogEntry[] { return [...entries] }
export function clearLogs(): void     { entries.length = 0 }
