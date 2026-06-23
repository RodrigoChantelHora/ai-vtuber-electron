import { useState, useCallback } from 'react'
import { ConfigManager, ConfigManagerClass } from '../services/ConfigManager'
import './SettingsPanel.css'

interface Props {
  onClose: () => void
  onToast: (msg: string) => void
  onModelChange?: () => void
}

const TABS = ['APIs', 'Provedores', 'Voz', 'Personagem', 'Modelo', 'Comportamento', 'Tutorial'] as const
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

export function SettingsPanel({ onClose, onToast, onModelChange }: Props) {
  const cfg = ConfigManager.getConfig()
  const [tab, setTab] = useState<Tab>('APIs')
  const [dirty, setDirty] = useState(false)

  const [keys, setKeys] = useState({
    openai: cfg.openai_api_key,
    anthropic: cfg.anthropic_api_key,
    elevenlabs: cfg.elevenlabs_api_key,
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

  const [model, setModel] = useState<{ fileName: string; loaded: boolean }>({
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

  const [testing, setTesting] = useState(false)

  const markDirty = useCallback(() => setDirty(true), [])

  const promptPreview = ConfigManagerClass.getVocabularySuffix(personality.style, personality.gender)

  const save = () => {
    ConfigManager.save({
      openai_api_key: keys.openai,
      anthropic_api_key: keys.anthropic,
      elevenlabs_api_key: keys.elevenlabs,
      stt_provider: providers.stt,
      llm_provider: providers.llm,
      tts_provider: providers.tts,
      vision_provider: providers.vision,
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
    })
    setDirty(false)
    onToast('Configurações salvas com sucesso!')
  }

  const reset = () => {
    ConfigManager.reset()
    const def = ConfigManager.getConfig()
    setKeys({ openai: '', anthropic: '', elevenlabs: '' })
    setProviders({ stt: 'openai', llm: 'openai', tts: 'openai', vision: 'openai' })
    setVoice({ elevenlabsId: '21m00Tcm4TlvDq8ikWAM', ttsVoice: 'nova', language: 'pt-BR' })
    setPersonality({ gender: 'neutro', style: 'fofo', prompt: def.system_prompt })
    setModel({ fileName: '', loaded: false })
    setBehavior({ history: 20, threshold: 0.3, quality: 70, autoCapture: false, autoListen: true })
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

  const handleImportVRM = async () => {
    const result = await window.electronAPI?.importVRM()
    if (result?.success && result.fileName) {
      setModel({ fileName: result.fileName, loaded: true })
      markDirty()
      onToast(`Modelo "${result.fileName}" importado com sucesso!`)
      onModelChange?.()
    } else if (result && !result.success && result.error !== 'Cancelado') {
      onToast(`Erro ao importar: ${result.error}`)
    }
  }

  const handleRemoveModel = async () => {
    if (!model.fileName) return
    const result = await window.electronAPI?.removeModel(model.fileName)
    if (result?.success) {
      setModel({ fileName: '', loaded: false })
      markDirty()
      onToast('Modelo removido.')
      onModelChange?.()
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
              <label>STT (Voz → Texto)</label>
              <select value={providers.stt} onChange={(e) => { setProviders((p) => ({ ...p, stt: e.target.value })); markDirty() }}>
                <option value="openai">OpenAI Whisper</option>
              </select>

              <label>LLM (Cérebro)</label>
              <select value={providers.llm} onChange={(e) => { setProviders((p) => ({ ...p, llm: e.target.value })); markDirty() }}>
                <option value="openai">OpenAI GPT-4o</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>

              <label>TTS (Texto → Voz)</label>
              <select value={providers.tts} onChange={(e) => { setProviders((p) => ({ ...p, tts: e.target.value })); markDirty() }}>
                <option value="openai">OpenAI TTS</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>

              <label>Visão</label>
              <select value={providers.vision} onChange={(e) => { setProviders((p) => ({ ...p, vision: e.target.value })); markDirty() }}>
                <option value="openai">OpenAI GPT-4o</option>
              </select>
            </div>
          )}

          {tab === 'Voz' && (
            <div className="tab-section">
              <label>Voz TTS</label>
              <select value={voice.ttsVoice} onChange={(e) => { setVoice((v) => ({ ...v, ttsVoice: e.target.value })); markDirty() }}>
                {TTS_VOICES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>

              <label>ElevenLabs Voice ID</label>
              <input
                type="text"
                value={voice.elevenlabsId}
                onChange={(e) => { setVoice((v) => ({ ...v, elevenlabsId: e.target.value })); markDirty() }}
                placeholder="21m00Tcm4TlvDq8ikWAM"
              />

              <label>Idioma (STT)</label>
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
                Você pode baixar modelos gratuitos em sites como VRoid Hub ou Sketchfab.
              </p>

              <div className="model-status">
                {model.loaded ? (
                  <div className="model-loaded">
                    <span className="model-icon">✅</span>
                    <div>
                      <strong>{model.fileName}</strong>
                      <p className="model-hint">Modelo carregado e pronto para uso.</p>
                    </div>
                  </div>
                ) : (
                  <div className="model-empty">
                    <span className="model-icon">📦</span>
                    <div>
                      <strong>Nenhum modelo importado</strong>
                      <p className="model-hint">Clique no botão abaixo para selecionar um arquivo .vrm</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="model-actions">
                <button className="btn btn-primary" onClick={handleImportVRM}>
                  📁 Importar Modelo VRM
                </button>
                {model.loaded && (
                  <button className="btn btn-danger" onClick={handleRemoveModel}>
                    🗑 Remover Modelo
                  </button>
                )}
              </div>

              <div className="prompt-preview">
                <strong>💡 Dica:</strong>
                <p>
                  Modelos VRM podem ser criados no{' '}
                  <a href="https://hub.vroid.com/" target="_blank" rel="noopener">VRoid Studio</a>
                  {' '}gratuitamente. Após importar, o personagem aparecerá na cena 3D automaticamente.
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

          {tab === 'Tutorial' && (
            <div className="tab-section tutorial">
              <h3>🎯 Primeiros Passos</h3>
              <ol>
                <li>Obtenha uma chave de API no site da <a href="https://platform.openai.com" target="_blank">OpenAI</a></li>
                <li>Vá na aba <b>APIs</b> e cole sua chave</li>
                <li>Vá na aba <b>Personagem</b> e escolha o estilo do seu V-tuber</li>
                <li>Clique em <b>Salvar</b> e pronto!</li>
              </ol>

              <h3>🔑 Chaves de API</h3>
              <ul>
                <li><b>OpenAI</b> — platform.openai.com (GPT-4o, Whisper, TTS)</li>
                <li><b>Anthropic</b> — console.anthropic.com (Claude, opcional)</li>
                <li><b>ElevenLabs</b> — elevenlabs.io (voz realista, opcional)</li>
              </ul>

              <h3>🎭 Personalidade</h3>
              <ul>
                <li><b>Fofo(a)</b> — Doce, carinhoso, gentil</li>
                <li><b>Jovem com gírias</b> — Informal, descolado</li>
                <li><b>Jovem cheio de gírias</b> — Internetês, hiper informal</li>
                <li><b>Educado</b> — Formal, cortês, profissional</li>
                <li><b>Ríspido</b> — Grosso, ignorante, sarcástico</li>
              </ul>

              <h3>⌨️ Atalhos</h3>
              <ul>
                <li><b>F1</b> — Configurações</li>
                <li><b>V</b> — Gravar voz</li>
                <li><b>Enter</b> — Enviar texto</li>
                <li><b>Esc</b> — Limpar histórico</li>
              </ul>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn btn-danger" onClick={reset}>Restaurar Padrões</button>
          <div className="footer-right">
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
