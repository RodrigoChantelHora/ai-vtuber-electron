import './ChatBubble.css'

interface Props {
  text: string
  isThinking: boolean
}

export function ChatBubble({ text, isThinking }: Props) {
  if (!text && !isThinking) return null

  return (
    <div className="chat-bubble">
      <div className="bubble-arrow" />
      <div className="bubble-content">
        {isThinking && !text ? (
          <span className="thinking">...</span>
        ) : (
          <p>{text}</p>
        )}
      </div>
    </div>
  )
}
