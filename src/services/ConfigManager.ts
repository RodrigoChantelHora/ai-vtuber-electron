export interface ApiConfig {
  openai_api_key: string
  anthropic_api_key: string
  elevenlabs_api_key: string
  gemini_api_key: string
  gemini_model: string

  stt_provider: string
  llm_provider: string
  tts_provider: string
  vision_provider: string

  // Ollama (LLM local gratuito)
  ollama_url: string
  ollama_model: string

  // Browser TTS
  browser_tts_rate: number
  browser_tts_pitch: number

  elevenlabs_voice_id: string
  system_prompt: string
  stt_language: string
  tts_voice: string

  max_conversation_history: number
  screen_capture_quality: number
  voice_activation_threshold: number

  auto_capture_screen: boolean
  auto_listen: boolean

  character_gender: string
  vocabulary_style: string
  model_filename: string

  // Atalhos de teclado (formato: "alt+v", "f1", "ctrl+shift+m")
  shortcut_voice: string
  shortcut_settings: string
  shortcut_clear: string

  // Gráficos / Performance
  graphics_quality: 'low' | 'medium' | 'high'
  fps_limit: number         // 0 = ilimitado, 30, 60
  shadows_enabled: boolean
  pixel_ratio: number       // 0.5, 0.75, 1.0, 1.5, 2.0
  vrm_update_rate: number   // 1 = todo frame, 2 = a cada 2 frames

  // HUD / Aparência
  bg_color: string
  bg_opacity: number
  accent_color: string
  text_color: string
  hide_titlebar: boolean
  hide_bottom_bar: boolean
  hide_scene_controls: boolean
  transparent_window: boolean
}

const DEFAULT_CONFIG: ApiConfig = {
  openai_api_key: '',
  anthropic_api_key: '',
  elevenlabs_api_key: '',
  gemini_api_key: '',
  gemini_model: 'gemini-3.5-flash',
  stt_provider: 'browser',
  llm_provider: 'openai',
  tts_provider: 'browser',
  vision_provider: 'openai',
  ollama_url: 'http://localhost:11434',
  ollama_model: 'llama3.2',
  browser_tts_rate: 1.0,
  browser_tts_pitch: 1.0,
  elevenlabs_voice_id: '21m00Tcm4TlvDq8ikWAM',
  system_prompt:
    'Você é uma assistente virtual que se apresenta como um personagem 3D na tela do usuário. Responda de forma natural e expressiva. Use {feliz}, {triste}, {surpreso}, {bravo} para indicar emoções.',
  stt_language: 'pt-BR',
  tts_voice: 'nova',
  max_conversation_history: 20,
  screen_capture_quality: 70,
  voice_activation_threshold: 0.3,
  auto_capture_screen: false,
  auto_listen: true,
  character_gender: 'neutro',
  vocabulary_style: 'fofo',
  model_filename: '',
  shortcut_voice: 'alt+v',
  shortcut_settings: 'f1',
  shortcut_clear: 'alt+escape',
  graphics_quality: 'high',
  fps_limit: 0,
  shadows_enabled: true,
  pixel_ratio: 1.0,   // Scene3D aplica window.devicePixelRatio na inicializacao
  vrm_update_rate: 1,
  bg_color: '#12121a',
  bg_opacity: 1.0,
  accent_color: '#4488ff',
  text_color: '#e0e0e8',
  hide_titlebar: false,
  hide_bottom_bar: false,
  hide_scene_controls: false,
  transparent_window: false,
}

class ConfigManagerClass {
  private config: ApiConfig = { ...DEFAULT_CONFIG }
  private listeners: Array<() => void> = []

  getConfig(): ApiConfig {
    return this.config
  }

  subscribe(fn: () => void) {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  private notify() {
    this.listeners.forEach((fn) => fn())
  }

  async load(): Promise<void> {
    try {
      const data = localStorage.getItem('ai-vtuber-config')
      if (data) {
        const parsed = JSON.parse(data) as ApiConfig
        // Migra modelos descontinuados
        const DEPRECATED_MODELS: Record<string, string> = {
          'gemini-2.0-flash-lite': 'gemini-3.5-flash',
        }
        if (parsed.gemini_model && DEPRECATED_MODELS[parsed.gemini_model]) {
          parsed.gemini_model = DEPRECATED_MODELS[parsed.gemini_model]
        }
        this.config = { ...DEFAULT_CONFIG, ...parsed }
      } else {
        const defaultData = { ...DEFAULT_CONFIG }
        localStorage.setItem('ai-vtuber-config', JSON.stringify(defaultData))
        this.config = defaultData
      }
    } catch {
      this.config = { ...DEFAULT_CONFIG }
    }
    this.notify()
  }

  save(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig }
    localStorage.setItem('ai-vtuber-config', JSON.stringify(this.config))
    this.notify()
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG }
    localStorage.setItem('ai-vtuber-config', JSON.stringify(this.config))
    this.notify()
  }

  static getSuggestedTTSVoice(gender: string): string {
    switch (gender) {
      case 'masculino': return 'onyx'
      case 'feminino': return 'nova'
      default: return 'alloy'
    }
  }

  static getVocabularySuffix(style: string, gender: string): string {
    const genderWord = (() => {
      switch (gender) {
        case 'masculino': return 'um garoto'
        case 'feminino': return 'uma garota'
        default: return 'uma pessoa'
      }
    })()

    const pronoun = (() => {
      switch (gender) {
        case 'masculino': return 'Ele'
        case 'feminino': return 'Ela'
        default: return 'Você'
      }
    })()

    switch (style) {
      case 'fofo':
        return `Você é ${genderWord} muito fofo(a) e meigo(a). ${pronoun} fala de forma doce, carinhosa e gentil. Use diminutivos carinhosos, seja sempre positivo(a) e encantador(a). Trate o usuário com muito afeto e delicadeza.`

      case 'jovem_girias':
        return `Você é ${genderWord} jovem e descolado(a). Use gírias modernas como 'tipo', 'mano', 'véi', 'tá ligado', 'bora', 'dale', 'tranquilo'. Seja informal, energético(a) e descontraído(a). Fale como um(a) adolescente ou jovem adulto(a) brasileiro(a).`

      case 'jovem_girias_cheio':
        return `Você é ${genderWord} jovem que fala cheio de gírias e internetês! Use muitas gírias contemporâneas: 'crush', 'mds', 'literalmente', 'tô', 'né', 'vsfe', 'tipo assim', 'slk', 'tmj', 'fml', 'kkk', 'aff'. Seja hiper informal, divertido(a) e exagerado(a). Fale como um(a) jovem que vive nas redes sociais.`

      case 'educado':
        return `Você é ${genderWord} muito educado(a) e formal. Use linguagem culta e rebuscada. Trate o usuário com máximo respeito, use 'senhor'/'senhora' e 'por favor' com frequência. Seja polido(a), cortês e exemplar em etiqueta. Mantenha sempre um tom profissional e elegante.`

      case 'rispido':
        return `Você é ${genderWord} grosso(a) e ignorante. Seja ríspido(a), use respostas curtas e grossas. Reclame de tudo, seja sarcástico(a) e mal-humorado(a). Mas no fundo você ainda responde e ajuda, mesmo resmungando o tempo todo.`

      default:
        return `Você é ${genderWord} simpático(a) e educado(a). Seja natural e amigável.`
    }
  }
}

export { ConfigManagerClass }
export const ConfigManager = new ConfigManagerClass()
