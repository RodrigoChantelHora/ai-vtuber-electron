import { useState, useCallback, useEffect } from 'react'
import { ConfigManager, ConfigManagerClass } from '../services/ConfigManager'
import './SettingsPanel.css'

interface Props {
  onClose: () => void
  onToast: (msg: string) => void
  onModelChange?: () => void
  onSettingsSaved?: () => void
}

const TABS = ['APIs', 'Provedores', 'Voz', 'Personagem', 'Modelo', 'Comportamento', 'Atalhos', 'HUD', 'Graficos', 'Tutorial'] as const
type Tab = typeof TABS[number]

const VOCABULARY_OPTIONS = [
  { value: 'fofo', label: 'Fofo(a) e meigo(a)' },
  { value: 'jovem_girias', label: 'Jovem com gírias' },
  { value: 'jovem_girias_cheio', label: 'Jovem cheio de gírias' },
  { value: 'educado', label: 'Educado e formal' },
  { value: 'rispido', label: 'Ríspido e ignorante' },
]

const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'neutro', label: 'Neutro / Outro' },
]

const LANGUAGE_OPTIONS = [
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'pt-PT', label: 'Português (PT)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es', label: 'Español' },
  { value: 'ja', label: '日本語' },
]

const TTS_VOICES = [
  { value: 'alloy', label: 'Alloy (neutra)' },
  { value: 'nova', label: 'Nova (feminina)' },
  { value: 'onyx', label: 'Onyx (masculina)' },
  { value: 'shimmer', label: 'Shimmer (feminina)' },
  { value: 'echo', label: 'Echo (masculina)' },
  { value: 'fable', label: 'Fable (britânica)' },
]

export function SettingsPanel({ onClose, onToast, onModelChange, onSettingsSaved }: Props) {
  const cfg = ConfigManager.getConfig()
  const [tab, setTab] = useState<Tab>('APIs')
  const [dirty, setDirty] = useState(false)

  const [keys, setKeys] = useState({
    openai: cfg.openai_api_key,
    anthropic: cfg.anthropic_api_key,
    elevenlabs: cfg.elevenlabs_api_key,
    gemini: cfg.gemini_api_key,
  })
  const [showKeys, setShowKeys] = useState(false)

  const [providers, setProviders] = useState({
    stt: cfg.stt_provider,
    llm: cfg.llm_provider,
    tts: cfg.tts_provider,
    vision: cfg.vision_provider,
  })

  const [voice, setVoice] = useState({
    elevenlabsId: cfg.elevenlabs_voice_id,
    ttsVoice: cfg.tts_voice,
    language: cfg.stt_language,
  })

  const [personality, setPersonality] = useState({
    gender: cfg.character_gender,
    style: cfg.vocabulary_style,
    prompt: cfg.system_prompt,
  })

  const [model, setModel] = useState<{ fileName: string; loaded: boolean; fileSize?: number }>({
    fileName: cfg.model_filename || '',
    loaded: !!cfg.model_filename,
  })

  const [behavior, setBehavior] = useState({
    history: cfg.max_conversation_history,
    threshold: cfg.voice_activation_threshold,
    quality: cfg.screen_capture_quality,
    autoCapture: cfg.auto_capture_screen,
    autoListen: cfg.auto_listen,
  })

  const [ollama, setOllama] = useState({
    url: cfg.ollama_url || 'http://localhost:11434',
    model: cfg.ollama_model || 'llama3.2',
  })

  const [geminiModel, setGeminiModel] = useState(cfg.gemini_model || 'gemini-3.5-flash')

  const [browserTts, setBrowserTts] = useState({
    rate: cfg.browser_tts_rate ?? 1.0,
    pitch: cfg.browser_tts_pitch ?? 1.0,
  })

  const [shortcuts, setShortcuts] = useState({
    voice:    cfg.shortcut_voice    || 'alt+v',
    settings: cfg.shortcut_settings || 'f1',
    clear:    cfg.shortcut_clear    || 'alt+escape',
  })
  const [capturingShortcut, setCapturingShortcut] = useState<string | null>(null)

  const [hud, setHud] = useState({
    bgColor:          cfg.bg_color          ?? '#12121a',
    bgOpacity:        cfg.bg_opacity        ?? 1.0,
    accentColor:      cfg.accent_color      ?? '#4488ff',
    textColor:        cfg.text_color        ?? '#e0e0e8',
    hideTitlebar:     cfg.hide_titlebar     ?? false,
    hideBottomBar:    cfg.hide_bottom_bar   ?? false,
    hideSceneControls:cfg.hide_scene_controls ?? false,
    transparentWindow:cfg.transparent_window ?? false,
  })

  const [graphics, setGraphics] = useState({
    preset:       (cfg.graphics_quality || 'high') as 'low' | 'medium' | 'high',
    fpsLimit:     cfg.fps_limit      ?? 0,
    shadows:      cfg.shadows_enabled ?? true,
    pixelRatio:   cfg.pixel_ratio    ?? Math.min(window.devicePixelRatio, 2),
    vrmRate:      cfg.vrm_update_rate ?? 1,
  })

  const [testing, setTesting] = useState(false)
  const [testingOllama, setTestingOllama] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const markDirty = useCallback(() => setDirty(true), [])

  const promptPreview = ConfigManagerClass.getVocabularySuffix(personality.style, personality.gender)

  const save = () => {
    ConfigManager.save({
      openai_api_key: keys.openai,
      anthropic_api_key: keys.anthropic,
      elevenlabs_api_key: keys.elevenlabs,
      gemini_api_key: keys.gemini,
      gemini_model: geminiModel,
      stt_provider: providers.stt,
      llm_provider: providers.llm,
      tts_provider: providers.tts,
      vision_provider: providers.vision,
      ollama_url: ollama.url,
      ollama_model: ollama.model,
      browser_tts_rate: browserTts.rate,
      browser_tts_pitch: browserTts.pitch,
      elevenlabs_voice_id: voice.elevenlabsId,
      tts_voice: voice.ttsVoice,
      stt_language: voice.language,
      character_gender: personality.gender,
      vocabulary_style: personality.style,
      system_prompt: personality.prompt,
      model_filename: model.fileName,
      max_conversation_history: behavior.history,
      voice_activation_threshold: behavior.threshold,
      screen_capture_quality: behavior.quality,
      auto_capture_screen: behavior.autoCapture,
      auto_listen: behavior.autoListen,
      shortcut_voice: shortcuts.voice,
      shortcut_settings: shortcuts.settings,
      shortcut_clear: shortcuts.clear,
      bg_color:           hud.bgColor,
      bg_opacity:         hud.bgOpacity,
      accent_color:       hud.accentColor,
      text_color:         hud.textColor,
      hide_titlebar:      hud.hideTitlebar,
      hide_bottom_bar:    hud.hideBottomBar,
      hide_scene_controls:hud.hideSceneControls,
      transparent_window: hud.transparentWindow,
      graphics_quality:  graphics.preset,
      fps_limit:         graphics.fpsLimit,
      shadows_enabled:   graphics.shadows,
      pixel_ratio:       graphics.pixelRatio,
      vrm_update_rate:   graphics.vrmRate,
    })
    setDirty(false)
    onToast('Configurações salvas com sucesso!')
    onSettingsSaved?.()
  }

  const reset = () => {
    ConfigManager.reset()
    const def = ConfigManager.getConfig()
    setKeys({ openai: '', anthropic: '', elevenlabs: '', gemini: '' })
    setGeminiModel('gemini-3.5-flash')
    setProviders({ stt: 'browser', llm: 'openai', tts: 'browser', vision: 'openai' })
    setVoice({ elevenlabsId: '21m00Tcm4TlvDq8ikWAM', ttsVoice: 'nova', language: 'pt-BR' })
    setPersonality({ gender: 'neutro', style: 'fofo', prompt: def.system_prompt })
    setModel({ fileName: '', loaded: false })
    setBehavior({ history: 20, threshold: 0.3, quality: 70, autoCapture: false, autoListen: true })
    setOllama({ url: 'http://localhost:11434', model: 'llama3.2' })
    setBrowserTts({ rate: 1.0, pitch: 1.0 })
    setShortcuts({ voice: 'alt+v', settings: 'f1', clear: 'alt+escape' })
    setHud({ bgColor: '#12121a', bgOpacity: 1.0, accentColor: '#4488ff', textColor: '#e0e0e8',
             hideTitlebar: false, hideBottomBar: false, hideSceneControls: false, transparentWindow: false })
    setDirty(false)
    onToast('Configurações restauradas para o padrão.')
  }

  const onPersonalityChange = (field: string, value: string) => {
    const p = { ...personality, [field]: value }
    setPersonality(p)

    if (field === 'gender') {
      const suggestedVoice = ConfigManagerClass.getSuggestedTTSVoice(value)
      setVoice((v) => ({ ...v, ttsVoice: suggestedVoice }))
    }
  }

  const generatePrompt = () => {
    const base = 'Você é uma assistente virtual que se apresenta como um personagem 3D na tela do usuário. Responda de forma natural e expressiva. Use {feliz}, {triste}, {surpreso}, {bravo} para indicar emoções.'
    const suffix = ConfigManagerClass.getVocabularySuffix(personality.style, personality.gender)
    setPersonality((p) => ({ ...p, prompt: `${base}\n\n--- Personalidade ---\n${suffix}` }))
    markDirty()
  }

  // Salva apenas o fileName no config sem exibir toast (silent save)
  const saveModelToConfig = (fileName: string) => {
    const cfg2 = ConfigManager.getConfig()
    ConfigManager.save({ ...cfg2, model_filename: fileName })
    setDirty(false)
  }

  const applyImportResult = (
    result: { success: boolean; fileName?: string; error?: string } | undefined,
    fileSize?: number,
  ) => {
    if (result?.success && result.fileName) {
      setModel({ fileName: result.fileName, loaded: true, fileSize })
      saveModelToConfig(result.fileName)   // auto-salva imediatamente
      onToast(`Modelo "${result.fileName}" importado com sucesso!`)
      onModelChange?.()
    } else if (result === undefined) {
      onToast('Erro: electronAPI indisponível — reinicie o app.')
    } else if (!result.success && result.error !== 'Cancelado') {
      onToast(`Erro ao importar: ${result.error}`)
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        resolve(dataUrl.split(',')[1])   // remove "data:...;base64,"
      }
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
      reader.readAsDataURL(file)
    })

  const handleImportVRM = async () => {
    if (isImporting) return
    if (!window.electronAPI) {
      onToast('Erro: API Electron não disponível. Reinicie o app.')
      return
    }
    setIsImporting(true)
    try {
      const result = await window.electronAPI.importVRM()
      applyImportResult(result)
    } catch (err: any) {
      onToast(`Erro inesperado: ${err?.message ?? err}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (isImporting) return

    const file = e.dataTransfer.files[0]
    if (!file) { onToast('Nenhum arquivo detectado.'); return }
    if (!file.name.toLowerCase().endsWith('.vrm')) {
      onToast('Apenas arquivos .vrm são suportados.')
      return
    }

    if (!window.electronAPI) {
      onToast('Erro: API Electron não disponível. Reinicie o app.')
      return
    }

    setIsImporting(true)
    try {
      // Estratégia 1: usar file.path (Electron estende File com path)
      const nativePath = (file as any).path as string | undefined
      if (nativePath && window.electronAPI.importVRMFromPath) {
        const result = await window.electronAPI.importVRMFromPath(nativePath)
        applyImportResult(result, file.size)
        return
      }

      // Estratégia 2: ler como base64 no renderer e enviar para o main salvar
      if (window.electronAPI.importVRMData) {
        const base64 = await readFileAsBase64(file)
        const result = await window.electronAPI.importVRMData(file.name, base64)
        applyImportResult(result, file.size)
        return
      }

      onToast('Erro: método de importação indisponível. Reinicie o app.')
    } catch (err: any) {
      onToast(`Erro ao importar: ${err?.message ?? err}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleRemoveModel = async () => {
    if (!model.fileName) return
    const result = await window.electronAPI?.removeModel(model.fileName)
    if (result?.success) {
      setModel({ fileName: '', loaded: false })
      saveModelToConfig('')
      onToast('Modelo removido.')
      onModelChange?.()
    } else if (result && !result.success) {
      onToast(`Erro ao remover: ${result.error}`)
    }
  }

  const testConnection = async () => {
    if (!keys.openai) { onToast('Insira uma chave da OpenAI primeiro.'); return }
    setTesting(true)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.openai}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
      })
      if (res.ok) onToast('Conexão OK! Chave válida.')
      else onToast('Falha na conexão. Verifique a chave.')
    } catch { onToast('Falha na conexão.') }
    setTesting(false)
  }

  // ── Captura de atalhos ────────────────────────────────────────────────────
  const formatShortcut = (s: string): string => {
    if (!s) return 'Nenhum'
    return s.split('+').map((k) => {
      if (k === 'ctrl')   return 'Ctrl'
      if (k === 'shift')  return 'Shift'
      if (k === 'alt')    return 'Alt'
      if (k === 'meta')   return '⌘'
      if (k === 'escape') return 'Esc'
      if (k === 'space')  return 'Espaço'
      if (/^f\d+$/.test(k)) return k.toUpperCase()
      return k.toUpperCase()
    }).join(' + ')
  }

  useEffect(() => {
    if (!capturingShortcut) return

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

      const parts: string[] = []
      if (e.ctrlKey)  parts.push('ctrl')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey)   parts.push('alt')
      if (e.metaKey)  parts.push('meta')
      const key = e.key === ' ' ? 'space' : e.key.toLowerCase()
      parts.push(key)

      setShortcuts((sc) => ({ ...sc, [capturingShortcut]: parts.join('+') }))
      setCapturingShortcut(null)
      markDirty()
    }

    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [capturingShortcut, markDirty])

  const testOllama = async () => {
    setTestingOllama(true)
    try {
      const baseUrl = (ollama.url || 'http://localhost:11434').replace(/\/$/, '')
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollama.model || 'llama3.2',
          messages: [{ role: 'user', content: 'ping' }],
          stream: false,
          max_tokens: 1,
        }),
      })
      if (res.ok) onToast(`Ollama OK! Modelo "${ollama.model}" respondendo.`)
      else onToast(`Ollama respondeu com erro ${res.status}. Verifique se o modelo foi baixado.`)
    } catch {
      onToast('Não foi possível conectar ao Ollama. Certifique-se de que ele está rodando.')
    }
    setTestingOllama(false)
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Configurações</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {tab === 'APIs' && (
            <div className="tab-section">
              <div className="api-field">
                <label>OpenAI API Key</label>
                <div className="input-group">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={keys.openai}
                    onChange={(e) => { setKeys((k) => ({ ...k, openai: e.target.value })); markDirty() }}
                    placeholder="sk-..."
                  />
                  <button className="eye-btn" onClick={() => setShowKeys(!showKeys)}>
                    {showKeys ? '🙈' : '👁'}
                  </button>
                </div>
                {keys.openai && <span className="status-dot ok" />}
              </div>

              <div className="api-field">
                <label>Anthropic API Key</label>
                <div className="input-group">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={keys.anthropic}
                    onChange={(e) => { setKeys((k) => ({ ...k, anthropic: e.target.value })); markDirty() }}
                    placeholder="sk-ant-..."
                  />
                </div>
                {keys.anthropic && <span className="status-dot ok" />}
              </div>

              <div className="api-field">
                <label>
                  Google Gemini API Key{' '}
                  <span className="free-badge">🆓 1.500 req/dia grátis</span>
                </label>
                <div className="input-group">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={keys.gemini}
                    onChange={(e) => { setKeys((k) => ({ ...k, gemini: e.target.value })); markDirty() }}
                    placeholder="AIza..."
                  />
                </div>
                {keys.gemini && <span className="status-dot ok" />}
                <p className="provider-hint">
                  Obtenha sua chave gratuita em{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                    aistudio.google.com/apikey
                  </a>
                </p>
              </div>

              <div className="api-field">
                <label>ElevenLabs API Key</label>
                <div className="input-group">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={keys.elevenlabs}
                    onChange={(e) => { setKeys((k) => ({ ...k, elevenlabs: e.target.value })); markDirty() }}
                    placeholder="..."
                  />
                </div>
                {keys.elevenlabs && <span className="status-dot ok" />}
              </div>

              <button className="btn btn-primary" onClick={testConnection} disabled={testing}>
                {testing ? 'Testando...' : 'Testar OpenAI'}
              </button>
            </div>
          )}

          {tab === 'Provedores' && (
            <div className="tab-section">
              <div className="free-notice">
                🆓 Opções marcadas com <strong>Gratuito</strong> não precisam de chave de API
              </div>

              <label>STT — Reconhecimento de Voz</label>
              <select value={providers.stt} onChange={(e) => { setProviders((p) => ({ ...p, stt: e.target.value })); markDirty() }}>
                <option value="browser">🆓 Navegador (Web Speech API) — Gratuito</option>
                <option value="openai">OpenAI Whisper (requer chave)</option>
              </select>

              <label>LLM — Inteligência (Cérebro)</label>
              <select value={providers.llm} onChange={(e) => { setProviders((p) => ({ ...p, llm: e.target.value })); markDirty() }}>
                <option value="gemini">🆓 Google Gemini (1.500 req/dia grátis)</option>
                <option value="ollama">🆓 Ollama — Local / Gratuito</option>
                <option value="openai">OpenAI GPT-4o (requer chave)</option>
                <option value="anthropic">Anthropic Claude (requer chave)</option>
              </select>

              {providers.llm === 'gemini' && (
                <div className="ollama-config">
                  <label>Modelo</label>
                  <select
                    value={geminiModel}
                    onChange={(e) => { setGeminiModel(e.target.value); markDirty() }}
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash (recomendado)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (mais rápido)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (avançado)</option>
                  </select>
                  <p className="provider-hint">
                    Configure sua chave na aba <strong>APIs</strong>. Obtenha em{' '}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                      aistudio.google.com
                    </a>
                  </p>
                </div>
              )}

              {providers.llm === 'ollama' && (
                <div className="ollama-config">
                  <p className="provider-hint">
                    Instale o <strong>Ollama</strong> em{' '}
                    <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">ollama.com</a>{' '}
                    e baixe um modelo: <code>ollama pull llama3.2</code>
                  </p>
                  <label>URL do Ollama</label>
                  <input
                    type="text"
                    value={ollama.url}
                    onChange={(e) => { setOllama((o) => ({ ...o, url: e.target.value })); markDirty() }}
                    placeholder="http://localhost:11434"
                  />
                  <label>Modelo</label>
                  <input
                    type="text"
                    value={ollama.model}
                    onChange={(e) => { setOllama((o) => ({ ...o, model: e.target.value })); markDirty() }}
                    placeholder="llama3.2"
                  />
                  <p className="provider-hint">
                    Outros modelos: <code>mistral</code>, <code>qwen2.5</code>, <code>phi3</code>
                  </p>
                  <button className="btn btn-secondary" onClick={testOllama} disabled={testingOllama}>
                    {testingOllama ? 'Testando...' : 'Testar Ollama'}
                  </button>
                </div>
              )}

              <label>TTS — Síntese de Voz</label>
              <select value={providers.tts} onChange={(e) => { setProviders((p) => ({ ...p, tts: e.target.value })); markDirty() }}>
                <option value="browser">🆓 Navegador (Web Speech) — Gratuito</option>
                <option value="openai">OpenAI TTS (requer chave)</option>
                <option value="elevenlabs">ElevenLabs (requer chave)</option>
              </select>

              {providers.tts === 'browser' && (
                <div className="browser-tts-config">
                  <label>Velocidade da voz — {browserTts.rate.toFixed(1)}x</label>
                  <input
                    type="range"
                    min="0.5" max="2" step="0.1"
                    value={browserTts.rate}
                    onChange={(e) => { setBrowserTts((b) => ({ ...b, rate: parseFloat(e.target.value) })); markDirty() }}
                  />
                  <label>Tom (pitch) — {browserTts.pitch.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0" max="2" step="0.1"
                    value={browserTts.pitch}
                    onChange={(e) => { setBrowserTts((b) => ({ ...b, pitch: parseFloat(e.target.value) })); markDirty() }}
                  />
                  <p className="provider-hint">
                    A voz usada depende do idioma configurado na aba <strong>Voz</strong> e das vozes instaladas no sistema operacional.
                  </p>
                </div>
              )}

              <label>Visão</label>
              <select value={providers.vision} onChange={(e) => { setProviders((p) => ({ ...p, vision: e.target.value })); markDirty() }}>
                <option value="openai">OpenAI GPT-4o (requer chave)</option>
              </select>
            </div>
          )}

          {tab === 'Voz' && (
            <div className="tab-section">
              {providers.tts === 'openai' && (
                <>
                  <label>Voz TTS (OpenAI)</label>
                  <select value={voice.ttsVoice} onChange={(e) => { setVoice((v) => ({ ...v, ttsVoice: e.target.value })); markDirty() }}>
                    {TTS_VOICES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </>
              )}

              {providers.tts === 'elevenlabs' && (
                <>
                  <label>ElevenLabs Voice ID</label>
                  <input
                    type="text"
                    value={voice.elevenlabsId}
                    onChange={(e) => { setVoice((v) => ({ ...v, elevenlabsId: e.target.value })); markDirty() }}
                    placeholder="21m00Tcm4TlvDq8ikWAM"
                  />
                </>
              )}

              {providers.tts === 'browser' && (
                <p className="provider-hint">
                  🆓 TTS do navegador ativo. Ajuste velocidade e tom na aba <strong>Provedores</strong>.
                </p>
              )}

              <label>Idioma (STT e TTS do navegador)</label>
              <select value={voice.language} onChange={(e) => { setVoice((v) => ({ ...v, language: e.target.value })); markDirty() }}>
                {LANGUAGE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          )}

          {tab === 'Personagem' && (
            <div className="tab-section">
              <label>Gênero do personagem</label>
              <select value={personality.gender} onChange={(e) => onPersonalityChange('gender', e.target.value)}>
                {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>

              <label>Estilo de vocabulário</label>
              <select value={personality.style} onChange={(e) => onPersonalityChange('style', e.target.value)}>
                {VOCABULARY_OPTIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>

              <div className="prompt-preview">
                <strong>Prévia da personalidade:</strong>
                <p>{promptPreview}</p>
              </div>

              <button className="btn btn-secondary" onClick={generatePrompt}>Gerar Prompt</button>

              <label>System Prompt (edição manual)</label>
              <textarea
                className="prompt-textarea"
                value={personality.prompt}
                onChange={(e) => { setPersonality((p) => ({ ...p, prompt: e.target.value })); markDirty() }}
                rows={6}
              />
              <span className="char-count">{personality.prompt.length} caracteres</span>
            </div>
          )}

          {tab === 'Modelo' && (
            <div className="tab-section">
              <label>Modelo 3D do Personagem</label>
              <p className="model-desc">
                Importe um arquivo <b>.vrm</b> para usar como seu V-tuber.
                Você pode baixar modelos gratuitos em sites como{' '}
                <a href="https://hub.vroid.com/" target="_blank" rel="noopener">VRoid Hub</a> ou Sketchfab.
              </p>

              <div
                className={`vrm-dropzone${isDragging ? ' vrm-dropzone--over' : ''}${isImporting ? ' vrm-dropzone--loading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isImporting ? (
                  <>
                    <span className="vrm-dropzone-icon vrm-spin">⏳</span>
                    <div>
                      <strong className="vrm-dropzone-label">Importando modelo...</strong>
                      <p className="model-hint">Aguarde enquanto o arquivo é processado.</p>
                    </div>
                  </>
                ) : isDragging ? (
                  <>
                    <span className="vrm-dropzone-icon">📂</span>
                    <div>
                      <strong className="vrm-dropzone-label">Solte o arquivo aqui!</strong>
                      <p className="model-hint">Arquivo .vrm detectado.</p>
                    </div>
                  </>
                ) : model.loaded ? (
                  <>
                    <span className="vrm-dropzone-icon">🧍</span>
                    <div className="vrm-model-info">
                      <strong className="vrm-dropzone-filename">{model.fileName}</strong>
                      <div className="vrm-model-meta">
                        {model.fileSize != null && (
                          <span className="vrm-meta-tag">
                            {(model.fileSize / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}
                        <span className="vrm-meta-tag vrm-meta-ok">✔ Carregado</span>
                      </div>
                      <p className="model-hint">Arraste outro .vrm para substituir. O personagem aparece na cena ao fundo.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="vrm-dropzone-icon">📦</span>
                    <div>
                      <strong>Arraste um arquivo .vrm aqui</strong>
                      <p className="model-hint">ou use o botão abaixo para selecionar pelo explorador</p>
                    </div>
                  </>
                )}
              </div>

              <div className="model-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleImportVRM}
                  disabled={isImporting}
                >
                  {isImporting ? '⏳ Importando...' : '📁 Selecionar arquivo .vrm'}
                </button>
                {model.loaded && !isImporting && (
                  <button className="btn btn-danger" onClick={handleRemoveModel}>
                    🗑 Remover Modelo
                  </button>
                )}
              </div>

              <div className="prompt-preview">
                <strong>💡 Como usar:</strong>
                <p>
                  Após importar, o personagem aparece imediatamente na cena 3D (atrás deste painel).
                  Modelos VRM podem ser criados gratuitamente no{' '}
                  <a href="https://vroid.com/en/studio" target="_blank" rel="noopener">VRoid Studio</a>.
                </p>
              </div>
            </div>
          )}

          {tab === 'Comportamento' && (
            <div className="tab-section">
              <label>Máximo de histórico: {behavior.history}</label>
              <input type="range" min={5} max={50} value={behavior.history}
                onChange={(e) => { setBehavior((b) => ({ ...b, history: +e.target.value })); markDirty() }} />

              <label>Sensibilidade de ativação: {behavior.threshold.toFixed(2)}</label>
              <input type="range" min={0} max={1} step={0.05} value={behavior.threshold}
                onChange={(e) => { setBehavior((b) => ({ ...b, threshold: +e.target.value })); markDirty() }} />

              <label>Qualidade da captura: {behavior.quality}%</label>
              <input type="range" min={10} max={100} value={behavior.quality}
                onChange={(e) => { setBehavior((b) => ({ ...b, quality: +e.target.value })); markDirty() }} />

              <label className="toggle-label">
                <input type="checkbox" checked={behavior.autoCapture}
                  onChange={(e) => { setBehavior((b) => ({ ...b, autoCapture: e.target.checked })); markDirty() }} />
                Captura automática de tela

              </label>

              <label className="toggle-label">
                <input type="checkbox" checked={behavior.autoListen}
                  onChange={(e) => { setBehavior((b) => ({ ...b, autoListen: e.target.checked })); markDirty() }} />
                Escuta automática (voz)
              </label>
            </div>
          )}

          {tab === 'Atalhos' && (
            <div className="tab-section">
              <p className="provider-hint" style={{ marginBottom: 12 }}>
                Os atalhos <strong>não disparam</strong> quando você está digitando em campos de texto.
                Clique em <strong>Capturar</strong> e pressione a combinação desejada.
              </p>

              {([
                { id: 'voice',    label: '\U0001f399 Voz (gravar / parar)',           value: shortcuts.voice },
                { id: 'settings', label: '\u2699\ufe0f Configurações (abrir / fechar)', value: shortcuts.settings },
                { id: 'clear',    label: '\U0001f5d1 Limpar histórico de conversa',   value: shortcuts.clear },
              ] as const).map(({ id, label, value }) => (
                <div key={id} className="shortcut-row">
                  <span className="shortcut-label">{label}</span>
                  <div className="shortcut-controls">
                    {capturingShortcut === id ? (
                      <span className="shortcut-capturing">Pressione a tecla...</span>
                    ) : (
                      <span className="shortcut-badge">{formatShortcut(value)}</span>
                    )}
                    <button
                      className={`btn btn-sm${capturingShortcut === id ? ' btn-danger' : ' btn-secondary'}`}
                      onClick={() => setCapturingShortcut(capturingShortcut === id ? null : id)}
                    >
                      {capturingShortcut === id ? 'Cancelar' : 'Capturar'}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        const defaults: Record<string, string> = { voice: 'alt+v', settings: 'f1', clear: 'alt+escape' }
                        setShortcuts((sc) => ({ ...sc, [id]: defaults[id] }))
                        markDirty()
                      }}
                      title="Restaurar padrão"
                    >
                      \u21ba
                    </button>
                  </div>
                </div>
              ))}

              <div className="shortcut-hint-box">
                <strong>Dica:</strong> Use modificadores como <kbd>Alt</kbd>, <kbd>Ctrl</kbd> ou <kbd>Shift</kbd>{' '}
                combinados com uma tecla para evitar conflitos. Ex: <kbd>Alt+V</kbd>, <kbd>Ctrl+M</kbd>, <kbd>F9</kbd>
              </div>
            </div>
          )}


          {tab === 'HUD' && (
            <div className="tab-section">
              <div className="hud-section-title">Fundo</div>

              <label>Cor do fundo</label>
              <div className="hud-color-row">
                <input type="color" value={hud.bgColor}
                  onChange={e => { setHud(h => ({ ...h, bgColor: e.target.value })); markDirty() }} />
                <span className="hud-color-val">{hud.bgColor}</span>
                <button className="btn btn-sm" onClick={() => { setHud(h => ({ ...h, bgColor: '#12121a' })); markDirty() }}>Reset</button>
              </div>

              <label>Opacidade do fundo — {Math.round(hud.bgOpacity * 100)}%</label>
              <input type="range" min={0} max={1} step={0.01} value={hud.bgOpacity}
                onChange={e => { setHud(h => ({ ...h, bgOpacity: parseFloat(e.target.value) })); markDirty() }} />
              {hud.bgOpacity < 0.1 && (
                <p className="hud-hint">⚠️ Fundo quase transparente. O app precisa ser reiniciado após salvar para aplicar a transparência total da janela.</p>
              )}

              <div className="hud-section-title" style={{ marginTop: 12 }}>Cores</div>

              <label>Cor de destaque (botões, foco)</label>
              <div className="hud-color-row">
                <input type="color" value={hud.accentColor}
                  onChange={e => { setHud(h => ({ ...h, accentColor: e.target.value })); markDirty() }} />
                <span className="hud-color-val">{hud.accentColor}</span>
                <button className="btn btn-sm" onClick={() => { setHud(h => ({ ...h, accentColor: '#4488ff' })); markDirty() }}>Reset</button>
              </div>

              <label>Cor do texto</label>
              <div className="hud-color-row">
                <input type="color" value={hud.textColor}
                  onChange={e => { setHud(h => ({ ...h, textColor: e.target.value })); markDirty() }} />
                <span className="hud-color-val">{hud.textColor}</span>
                <button className="btn btn-sm" onClick={() => { setHud(h => ({ ...h, textColor: '#e0e0e8' })); markDirty() }}>Reset</button>
              </div>

              <div className="hud-section-title" style={{ marginTop: 12 }}>Visibilidade</div>

              <label className="toggle-label">
                <input type="checkbox" checked={hud.hideTitlebar}
                  onChange={e => { setHud(h => ({ ...h, hideTitlebar: e.target.checked })); markDirty() }} />
                Ocultar barra de título
              </label>

              <label className="toggle-label">
                <input type="checkbox" checked={hud.hideBottomBar}
                  onChange={e => { setHud(h => ({ ...h, hideBottomBar: e.target.checked })); markDirty() }} />
                Ocultar barra inferior (chat / status)
              </label>

              <label className="toggle-label">
                <input type="checkbox" checked={hud.hideSceneControls}
                  onChange={e => { setHud(h => ({ ...h, hideSceneControls: e.target.checked })); markDirty() }} />
                Ocultar controles de pose / câmera
              </label>

              <div className="hud-section-title" style={{ marginTop: 12 }}>Modo Personagem</div>
              <p className="hud-hint">Deixa só o personagem visível — sem barra de título, sem chat, sem controles. Útil para uso como avatar de fundo.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => {
                  setHud(h => ({ ...h, hideTitlebar: true, hideBottomBar: true, hideSceneControls: true, bgOpacity: 0 }))
                  markDirty()
                }}>Ativar Modo Personagem</button>
                <button className="btn" onClick={() => {
                  setHud(h => ({ ...h, hideTitlebar: false, hideBottomBar: false, hideSceneControls: false, bgOpacity: 1 }))
                  markDirty()
                }}>Restaurar</button>
              </div>
            </div>
          )}

          {tab === 'Graficos' && (
            <div className="tab-section">
              <h3>Graficos e Performance</h3>

              <label>Preset de Qualidade</label>
              <div className="gfx-presets">
                {(['low', 'medium', 'high'] as const).map((p) => {
                  const labels = { low: 'Baixo', medium: 'Medio', high: 'Alto' }
                  const descs  = {
                    low:    '30fps cap, sem sombras, resolucao 75%',
                    medium: '60fps, sem sombras, resolucao 100%',
                    high:   'Sem limite, sombras on, resolucao maxima',
                  }
                  return (
                    <button
                      key={p}
                      className={`gfx-preset-btn${graphics.preset === p ? ' active' : ''}`}
                      onClick={() => {
                        const next = {
                          low:    { preset: 'low'    as const, fpsLimit: 30, shadows: false, pixelRatio: 0.75, vrmRate: 2 },
                          medium: { preset: 'medium' as const, fpsLimit: 0,  shadows: false, pixelRatio: 1.0,  vrmRate: 1 },
                          high:   { preset: 'high'   as const, fpsLimit: 0,  shadows: true,  pixelRatio: Math.min(window.devicePixelRatio, 2), vrmRate: 1 },
                        }[p]
                        setGraphics(next)
                        markDirty()
                      }}
                    >
                      <span className="gfx-preset-name">{labels[p]}</span>
                      <span className="gfx-preset-desc">{descs[p]}</span>
                    </button>
                  )
                })}
              </div>

              <div className="settings-divider" />
              <label>Configuracoes Avancadas</label>

              <label>Limite de FPS</label>
              <select value={graphics.fpsLimit} onChange={e => { setGraphics(g => ({ ...g, fpsLimit: +e.target.value, preset: 'high' })); markDirty() }}>
                <option value={0}>Ilimitado</option>
                <option value={60}>60 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={24}>24 FPS</option>
                <option value={15}>15 FPS</option>
              </select>

              <label>Resolucao de render</label>
              <select value={graphics.pixelRatio} onChange={e => { setGraphics(g => ({ ...g, pixelRatio: +e.target.value, preset: 'high' })); markDirty() }}>
                <option value={2.0}>200% (nativo HiDPI)</option>
                <option value={1.5}>150%</option>
                <option value={1.0}>100% (recomendado)</option>
                <option value={0.75}>75% (leve)</option>
                <option value={0.5}>50% (muito leve)</option>
              </select>

              <label>Frequencia de update VRM</label>
              <select value={graphics.vrmRate} onChange={e => { setGraphics(g => ({ ...g, vrmRate: +e.target.value, preset: 'high' })); markDirty() }}>
                <option value={1}>Todo frame (maxima qualidade)</option>
                <option value={2}>A cada 2 frames (leve)</option>
                <option value={3}>A cada 3 frames (muito leve)</option>
              </select>

              <div className="settings-check-row">
                <input type="checkbox" id="gfx-shadows" checked={graphics.shadows}
                  onChange={e => { setGraphics(g => ({ ...g, shadows: e.target.checked, preset: 'high' })); markDirty() }} />
                <label htmlFor="gfx-shadows">Sombras em tempo real</label>
              </div>

              <p className="hud-hint">As alteracoes de graficos sao aplicadas ao salvar, sem precisar reiniciar.</p>
            </div>
          )}

          {tab === 'Tutorial' && (
            <div className="tab-section tutorial">
              <h3>\U0001f3af Primeiros Passos</h3>
              <ol>
                <li>Vá na aba <b>Provedores</b> e escolha seu LLM preferido</li>
                <li>Se usar <b>Google Gemini</b>: cadastre-se em aistudio.google.com e cole a chave em <b>APIs</b></li>
                <li>Se usar <b>Ollama</b>: instale em ollama.com e rode <code>ollama pull llama3.2</code></li>
                <li>Vá na aba <b>Personagem</b> e escolha o estilo do seu V-tuber</li>
                <li>Clique em <b>Salvar</b> e pronto!</li>
              </ol>

              <h3>\U0001f511 Chaves de API</h3>
              <ul>
                <li><b>Google Gemini</b> — aistudio.google.com (\U0001f193 1.500 req/dia grátis)</li>
                <li><b>Ollama</b> — ollama.com (\U0001f193 100% local e gratuito)</li>
                <li><b>OpenAI</b> — platform.openai.com (GPT-4o, Whisper, TTS)</li>
                <li><b>Anthropic</b> — console.anthropic.com (Claude, opcional)</li>
                <li><b>ElevenLabs</b> — elevenlabs.io (voz realista, opcional)</li>
              </ul>

              <h3>\u2328\ufe0f Atalhos padrão</h3>
              <ul>
                <li><b>Alt+V</b> — Gravar / parar voz</li>
                <li><b>F1</b> — Abrir / fechar configurações</li>
                <li><b>Alt+Esc</b> — Limpar histórico</li>
                <li>Configure seus próprios atalhos na aba <b>Atalhos</b></li>
              </ul>

              <h3>\U0001f3ad Personalidade</h3>
              <ul>
                <li><b>Fofo(a)</b> — Doce, carinhoso, gentil</li>
                <li><b>Jovem com gírias</b> — Informal, descolado</li>
                <li><b>Jovem cheio de gírias</b> — Internetês, hiper informal</li>
                <li><b>Educado</b> — Formal, cortês, profissional</li>
                <li><b>Ríspido</b> — Grosso, ignorante, sarcástico</li>
              </ul>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn btn-danger" onClick={reset}>Restaurar Padrões</button>
          <div className="footer-right">
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={!dirty}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
