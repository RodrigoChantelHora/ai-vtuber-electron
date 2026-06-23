import './TitleBar.css'

interface Props {
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
}

export function TitleBar({ onMinimize, onMaximize, onClose }: Props) {
  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        <span className="title-logo">AI Vtuber</span>
      </div>
      <div className="title-bar-controls">
        <button className="tb-btn" onClick={onMinimize}>─</button>
        <button className="tb-btn" onClick={onMaximize}>□</button>
        <button className="tb-btn tb-close" onClick={onClose}>✕</button>
      </div>
    </div>
  )
}
