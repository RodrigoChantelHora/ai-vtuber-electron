import { ConfigManager } from './ConfigManager'

/** Transcreve um blob de áudio via OpenAI Whisper. */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const cfg = ConfigManager.getConfig()

  if (!cfg.openai_api_key) throw new Error('OpenAI key não configurada')

  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', cfg.stt_language)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.openai_api_key}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whisper error: ${err}`)
  }

  const data = await res.json()
  return data.text || ''
}

/**
 * Usa a Web Speech API do navegador para reconhecimento de voz.
 * Retorna uma Promise que resolve com o texto reconhecido.
 * Chame `recognition.stop()` no ref para cancelar antes do fim.
 */
export function startBrowserSTT(
  language: string,
  onResult: (text: string) => void,
  onError: (msg: string) => void,
  onEnd: () => void,
): any {
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  if (!SR) {
    onError('Web Speech API não suportada neste navegador')
    return null
  }

  const recognition = new SR()
  recognition.lang = language
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (e: any) => {
    const text: string = e.results[0][0].transcript
    onResult(text)
  }

  recognition.onerror = (e: any) => {
    onError(`Erro de reconhecimento: ${e.error}`)
  }

  recognition.onend = () => {
    onEnd()
  }

  recognition.start()
  return recognition
}
