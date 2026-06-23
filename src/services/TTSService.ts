import { ConfigManager } from './ConfigManager'

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer | null> {
  const cfg = ConfigManager.getConfig()

  if (cfg.tts_provider === 'elevenlabs') {
    return callElevenLabs(text)
  }
  return callOpenAITTS(text)
}

async function callOpenAITTS(text: string): Promise<ArrayBuffer | null> {
  const cfg = ConfigManager.getConfig()
  if (!cfg.openai_api_key) throw new Error('OpenAI key not configured')

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.openai_api_key}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: cfg.tts_voice,
      response_format: 'wav',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI TTS error: ${err}`)
  }

  return res.arrayBuffer()
}

async function callElevenLabs(text: string): Promise<ArrayBuffer | null> {
  const cfg = ConfigManager.getConfig()
  if (!cfg.elevenlabs_api_key) throw new Error('ElevenLabs key not configured')

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${cfg.elevenlabs_voice_id}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': cfg.elevenlabs_api_key,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs error: ${err}`)
  }

  return res.arrayBuffer()
}
