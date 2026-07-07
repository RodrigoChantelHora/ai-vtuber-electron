import { ConfigManager } from './ConfigManager'

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer | null> {
  const cfg = ConfigManager.getConfig()
  if (cfg.tts_provider === 'browser') return speakBrowser(text)
  if (cfg.tts_provider === 'elevenlabs') return callElevenLabs(text)
  return callOpenAITTS(text)
}

// Nomes tipicamente femininos em vozes do sistema (pt-BR / en)
const FEMALE_HINTS = /francisca|maria|vitoria|luciana|heloisa|female|feminin|woman|girl|f\b/i
const MALE_HINTS   = /antonio|daniel|male|masculin|man|boy|\bm\b/i

function pickVoice(gender: string, lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  const langCode = lang.toLowerCase()
  // Preferência: mesmo locale (pt-BR), depois mesmo idioma (pt), depois qualquer
  const byLocale  = voices.filter(v => v.lang.toLowerCase() === langCode)
  const byLang    = voices.filter(v => v.lang.toLowerCase().startsWith(langCode.split('-')[0]))
  const pool      = byLocale.length ? byLocale : byLang.length ? byLang : voices

  if (gender === 'feminino') {
    return pool.find(v => FEMALE_HINTS.test(v.name))
        ?? pool.find(v => !MALE_HINTS.test(v.name))
        ?? pool[0]
  }
  if (gender === 'masculino') {
    return pool.find(v => MALE_HINTS.test(v.name))
        ?? pool[0]
  }
  return pool[0]
}

function speakBrowser(text: string): Promise<null> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(null); return }

    const cfg = ConfigManager.getConfig()
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang  = cfg.stt_language
    utterance.rate  = cfg.browser_tts_rate  ?? 1.0
    utterance.pitch = cfg.browser_tts_pitch ?? 1.0

    // Vozes podem não estar prontas ainda — tenta depois de onvoiceschanged
    const trySpeak = () => {
      const voice = pickVoice(cfg.character_gender, cfg.stt_language)
      if (voice) utterance.voice = voice
      utterance.onend   = () => resolve(null)
      utterance.onerror = () => resolve(null)
      window.speechSynthesis.speak(utterance)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      trySpeak()
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        trySpeak()
      }
    }
  })
}

async function callOpenAITTS(text: string): Promise<ArrayBuffer | null> {
  const cfg = ConfigManager.getConfig()
  if (!cfg.openai_api_key) throw new Error('OpenAI key não configurada')

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
  if (!cfg.elevenlabs_api_key) throw new Error('ElevenLabs key não configurada')

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
        model_id: 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  )

  if (!res.ok) {
    const raw = await res.text()
    let msg = raw
    try {
      const body = JSON.parse(raw)
      const detail = body?.detail
      if (detail?.code === 'paid_plan_required' || detail?.code === 'subscription_required') {
        throw new Error(
          'ElevenLabs: plano pago necessário para uso da API.\n' +
          'Alternativas gratuitas: Browser TTS (nas configurações → Provedores → TTS → Navegador) ' +
          'ou OpenAI TTS (com chave OpenAI).',
        )
      }
      msg = detail?.message || raw
    } catch (e: any) {
      if (e.message.startsWith('ElevenLabs:')) throw e
    }
    throw new Error(`ElevenLabs error: ${msg}`)
  }

  return res.arrayBuffer()
}
