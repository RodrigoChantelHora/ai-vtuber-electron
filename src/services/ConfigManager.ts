export interface ApiConfig {
  openai_api_key: string
  anthropic_api_key: string
  elevenlabs_api_key: string

  stt_provider: string
  llm_provider: string
  tts_provider: string
  vision_provider: string

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
}

const DEFAULT_CONFIG: ApiConfig = {
  openai_api_key: '',
  anthropic_api_key: '',
  elevenlabs_api_key: '',
  stt_provider: 'openai',
  llm_provider: 'openai',
  tts_provider: 'openai',
  vision_provider: 'openai',
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
