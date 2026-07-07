import './TitleBar.css'

interface Props {
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
  onLogsClick?: () => void
}

export function TitleBar({ onMinimize, onMaximize, onClose, onLogsClick }: Props) {
  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        <span className="title-logo">AI Vtuber</span>
      </div>
      <div className="title-bar-controls">
        {onLogsClick && (
          <button className="tb-btn tb-logs" onClick={onLogsClick} title="Logs">&#128203;</button>
        )}
        <button className="tb-btn" onClick={onMinimize}>&#8211;</button>
        <button className="tb-btn" onClick={onMaximize}>&#9633;</button>
        <button className="tb-btn tb-close" onClick={onClose}>&#10005;</button>
      </div>
    </div>
  )
}
