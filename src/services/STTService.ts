import { ConfigManager } from './ConfigManager'

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const cfg = ConfigManager.getConfig()

  if (!cfg.openai_api_key) throw new Error('OpenAI key not configured')

  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', cfg.stt_language)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.openai_api_key}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whisper error: ${err}`)
  }

  const data = await res.json()
  return data.text || ''
}
