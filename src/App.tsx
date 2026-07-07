import { useState, useEffect, useRef, useCallback } from 'react'
import { ConfigManager } from './services/ConfigManager'
import { askLLM, clearHistory } from './services/LLMService'
import { synthesizeSpeech } from './services/TTSService'
import { transcribeAudio, startBrowserSTT } from './services/STTService'
import { describeImage } from './services/VisionService'
import { Scene3D } from './three/Scene3D'
import { ExpressionManager } from './three/ExpressionManager'
import { TitleBar } from './components/TitleBar'
import { SettingsPanel } from './components/SettingsPanel'
import { SceneControls } from './components/SceneControls'
import { ChatBubble } from './components/ChatBubble'
import { TextInput } from './components/TextInput'
import { StatusBar } from './components/StatusBar'
import { ToastContainer, type ToastItem, type ToastLevel } from './components/Toast'
import { LogPanel } from './components/LogPanel'
import { LoadingScreen } from './components/LoadingScreen'
import { logInfo, logWarn, logError } from './services/LogService'
import { NeedsSystem } from './services/NeedsSystem'
import './App.css'

type AppState = 'idle' | 'listening' | 'thinking' | 'talking'

function extractEmotion(text: string): string {
  const match = text.match(/\{(feliz|triste|surpreso|bravo|neutro)\}/)
  if (match) {
    return ExpressionManager.mapEmotionTag(match[1])
  }
  return 'neutral'
}

function stripEmotionTags(text: string): string {
  return text.replace(/\{(feliz|triste|surpreso|bravo|neutro)\}/g, '').trim()
}

export default function App() {
  const [state, setState] = useState<AppState>('idle')
  const [bubbleText, setBubbleText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Pronto')
  const [audioLevel, setAudioLevel] = useState(0)
  const [gender, setGender] = useState(() => ConfigManager.getConfig().character_gender)
  const [poseIndex, setPoseIndex] = useState(0)
  const [isEating, setIsEating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadMsg, setLoadMsg] = useState('Iniciando...')
  const [isSleeping, setIsSleeping] = useState(false)
  const [hudCfg, setHudCfg] = useState(() => {
    const c = ConfigManager.getConfig()
    return {
      bgColor: c.bg_color, bgOpacity: c.bg_opacity,
      accentColor: c.accent_color, textColor: c.text_color,
      hideTitlebar: c.hide_titlebar, hideBottomBar: c.hide_bottom_bar,
      hideSceneControls: c.hide_scene_controls, transparentWindow: c.transparent_window,
    }
  })

  const sceneRef = useRef<Scene3D | null>(null)
  const needsRef = useRef<NeedsSystem | null>(null)
  const threeContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<any>(null)
  const isProcessingRef = useRef(false)
  const chunksRef = useRef<Blob[]>([])

  const showToast = useCallback((message: string, level: ToastLevel = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev.slice(-4), { id, message, level }])
    if (level === 'error') logError(message)
    else if (level === 'warn') logWarn(message)
    else logInfo(message)
  }, [])

  // Mostra notificacao de necessidade (toast + Windows notification se minimizado)
  const showNeed = useCallback((title: string, body: string, emoji: string, toastMsg: string) => {
    showToast(`${emoji} ${toastMsg}`, 'warn')
    if (!document.hasFocus()) {
      window.electronAPI?.showNotification(title, body)
    }
  }, [showToast])

  useEffect(() => {
    ConfigManager.load()
    return ConfigManager.subscribe(() => {
      const c = ConfigManager.getConfig()
      setHudCfg({
        bgColor: c.bg_color, bgOpacity: c.bg_opacity,
        accentColor: c.accent_color, textColor: c.text_color,
        hideTitlebar: c.hide_titlebar, hideBottomBar: c.hide_bottom_bar,
        hideSceneControls: c.hide_scene_controls, transparentWindow: c.transparent_window,
      })
    })
  }, [])

  // Sistema de necessidades (fome / sede / cansaco)
  useEffect(() => {
    const needs = new NeedsSystem()
    needsRef.current = needs
    needs.start((type, info) => {
      showNeed(info.title, info.body, info.emoji,
        type === 'hunger' ? 'Personagem com fome!' :
        type === 'thirst' ? 'Personagem com sede!' :
        'Personagem com sono!'
      )
    })
    return () => needs.stop()
  }, [showNeed])

  // Aplica configuracoes de graficos no Scene3D
  const applyGraphics = useCallback(() => {
    const scene = sceneRef.current
    if (!scene) return
    const c = ConfigManager.getConfig()
    scene.setFpsLimit(c.fps_limit ?? 0)
    scene.setShadows(c.shadows_enabled ?? true)
    scene.setPixelRatio(c.pixel_ratio ?? Math.min(window.devicePixelRatio, 2))
    scene.setVrmUpdateRate(c.vrm_update_rate ?? 1)
  }, [])

  // Aplica variáveis CSS globais do HUD
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--bg-color',    hudCfg.bgColor || '#12121a')
    r.setProperty('--bg-opacity',  String(hudCfg.bgOpacity ?? 1))
    r.setProperty('--accent-color', hudCfg.accentColor || '#4488ff')
    r.setProperty('--text-color',  hudCfg.textColor || '#e0e0e8')
  }, [hudCfg])

  const loadModelFromStorage = useCallback(async () => {
    const scene = sceneRef.current
    if (!scene) {
      // Sem cena ainda, garante que o loading seja escondido
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadProgress(5)
    setLoadMsg('Iniciando...')

    try {
      scene.setProgressCallback((pct, msg) => {
        setLoadProgress(pct)
        setLoadMsg(msg)
      })

      const cfg = ConfigManager.getConfig()
      scene.setGender(cfg.character_gender)
      setGender(cfg.character_gender)

      const modelInfo = await window.electronAPI?.getLoadedModel()
      if (modelInfo?.data) {
        try {
          setLoadProgress(20)
          setLoadMsg('Carregando modelo VRM...')
          await scene.loadVRMFromData(modelInfo.data)
        } catch {
          setLoadMsg('Usando modelo padrão...')
          scene.loadDefaultModel()
          setLoadProgress(95)
        }
      } else {
        setLoadProgress(90)
        setLoadMsg('Modelo padrão...')
        scene.loadDefaultModel()
      }

      applyGraphics()
      setPoseIndex(scene.getPoseIndex())
      setLoadProgress(100)
      setLoadMsg('Pronto!')
    } catch (err: any) {
      setLoadMsg('Erro: ' + (err?.message ?? 'falha no carregamento'))
    } finally {
      // SEMPRE esconde o loading, seja erro ou sucesso
      setTimeout(() => setLoading(false), 350)
    }
  }, [applyGraphics])

  useEffect(() => {
    if (!threeContainerRef.current) return
    const scene = new Scene3D(threeContainerRef.current)
    sceneRef.current = scene
    loadModelFromStorage()

    return () => { scene.destroy() }
  }, [loadModelFromStorage])

  const processInput = useCallback(async (text: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    try {
      setState('thinking')
      setBubbleText('...')
      setStatusMessage('Pensando...')

      const cfg = ConfigManager.getConfig()
      let finalInput = text

      if (cfg.auto_capture_screen || text.toLowerCase().includes('tela')) {
        setStatusMessage('Analisando tela...')
        const base64 = await window.electronAPI?.captureScreen()
        if (base64) {
          const visionResult = await describeImage(base64)
          finalInput = `[Contexto da tela: ${visionResult}]\n\nUsuário: ${text}`
        }
      }

      const response = await askLLM(finalInput)
      const emotion = extractEmotion(response)
      const cleanText = stripEmotionTags(response)

      setBubbleText(cleanText)
      setStatusMessage('Falando...')
      setState('talking')

      sceneRef.current?.expressions.setExpression(emotion)

      const cfg2 = ConfigManager.getConfig()
      if (cfg2.tts_provider === 'browser') {
        // Browser TTS: lip sync falso via animação
        sceneRef.current?.lipSync.startFake()
        await synthesizeSpeech(cleanText)
        sceneRef.current?.lipSync.stopFake()
      } else {
        const audioData = await synthesizeSpeech(cleanText)
        if (audioData && audioRef.current) {
          const blob = new Blob([audioData], { type: 'audio/wav' })
          const url = URL.createObjectURL(blob)
          audioRef.current.src = url
          sceneRef.current?.lipSync.start(audioRef.current)
          await audioRef.current.play()
        }
      }

      setState('idle')
      setStatusMessage('Pronto')
      sceneRef.current?.expressions.setExpression('neutral')

      setTimeout(() => setBubbleText(''), 5000)
    } catch (err: any) {
      showToast(`Erro: ${err.message}`, 'error')
      setState('idle')
      setStatusMessage('Erro')
      sceneRef.current?.expressions.setExpression('sad')
      setBubbleText('Desculpe, algo deu errado.')
    } finally {
      isProcessingRef.current = false
    }
  }, [showToast])

  const handleVoiceToggle = useCallback(async () => {
    const cfg = ConfigManager.getConfig()

    // ── Browser STT (Web Speech API) ─────────────────────────────────────────
    if (cfg.stt_provider === 'browser') {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
        setState('idle')
        setStatusMessage('Pronto')
        return
      }

      setState('listening')
      setStatusMessage('Ouvindo...')

      recognitionRef.current = startBrowserSTT(
        cfg.stt_language,
        async (text) => {
          recognitionRef.current = null
          if (text.trim()) {
            setBubbleText(text)
            await processInput(text)
          } else {
            setState('idle')
            setStatusMessage('Pronto')
          }
        },
        (errMsg) => {
          recognitionRef.current = null
          showToast(errMsg, 'error')
          setState('idle')
          setStatusMessage('Pronto')
        },
        () => {
          recognitionRef.current = null
          setState((prev) => (prev === 'listening' ? 'idle' : prev))
          setStatusMessage((prev) => (prev === 'Ouvindo...' ? 'Pronto' : prev))
        },
      )
      return
    }

    // ── Whisper STT (MediaRecorder → API) ─────────────────────────────────────
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        setStatusMessage('Transcrevendo...')
        try {
          const text = await transcribeAudio(blob)
          if (text.trim()) {
            setBubbleText(text)
            await processInput(text)
          }
        } catch (err: any) {
          showToast(`Erro ao transcrever: ${err.message}`)
          setState('idle')
          setStatusMessage('Pronto')
        }
      }

      recorder.start()
      setState('listening')
      setStatusMessage('Ouvindo...')
      showToast('Gravando... fale algo')
    } catch (err: any) {
      showToast(`Erro microfone: ${err.message}`, 'error')
    }
  }, [processInput, showToast])

  const handleTextSubmit = useCallback((text: string) => {
    setBubbleText(text)
    processInput(text)
  }, [processInput])

  useEffect(() => {
    const toShortcut = (e: KeyboardEvent): string => {
      const parts: string[] = []
      if (e.ctrlKey)  parts.push('ctrl')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey)   parts.push('alt')
      if (e.metaKey)  parts.push('meta')
      const key = e.key === ' ' ? 'space' : e.key.toLowerCase()
      parts.push(key)
      return parts.join('+')
    }

    const isTyping = (): boolean => {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' ||
        (el as HTMLElement).isContentEditable
    }

    const handleKey = (e: KeyboardEvent) => {
      const pressed = toShortcut(e)
      const cfg = ConfigManager.getConfig()

      if (pressed === cfg.shortcut_settings) {
        e.preventDefault()
        setShowSettings((s) => !s)
        return
      }

      // Os demais atalhos não disparam ao digitar em campos de texto
      if (isTyping()) return

      if (pressed === cfg.shortcut_voice) {
        e.preventDefault()
        handleVoiceToggle()
        return
      }

      if (pressed === cfg.shortcut_clear) {
        e.preventDefault()
        clearHistory()
        showToast('Histórico limpo')
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleVoiceToggle, showToast])

  useEffect(() => {
    if (!showSettings && state === 'idle') {
      setStatusMessage('Pronto')
    }
  }, [showSettings, state])

  return (
    <div className="app">
      {!hudCfg.hideTitlebar && (
        <TitleBar
          onMinimize={() => window.electronAPI?.minimize()}
          onMaximize={() => window.electronAPI?.maximize()}
          onClose={() => window.electronAPI?.close()}
          onLogsClick={() => setShowLogs((s) => !s)}
        />
      )}

      <div className="main-area">
        <div className="three-container" ref={threeContainerRef}>
          <ChatBubble text={bubbleText} isThinking={state === 'thinking'} />
          {!hudCfg.hideSceneControls && (
            <SceneControls
              scene={sceneRef.current}
              gender={gender}
              poseIndex={poseIndex}
              onPoseChange={(i) => {
                setPoseIndex(i)
                sceneRef.current?.setPose(i)
              }}
              onResetCamera={() => sceneRef.current?.resetCamera()}
              isEating={isEating}
              isSleeping={isSleeping}
              onEat={(foodId) => {
                sceneRef.current?.startEating(foodId)
                setIsEating(true)
                needsRef.current?.satisfy('hunger')
              }}
              onStopEating={() => {
                sceneRef.current?.stopEating()
                setIsEating(false)
              }}
              onSleep={() => {
                sceneRef.current?.startSleeping()
                setIsSleeping(true)
                needsRef.current?.satisfy('tired')
              }}
              onWakeUp={() => {
                sceneRef.current?.stopSleeping()
                setIsSleeping(false)
              }}
            />
          )}
        </div>

        {!hudCfg.hideBottomBar && (
          <div className="bottom-bar">
            <TextInput onSubmit={handleTextSubmit} disabled={isProcessingRef.current} />
            <StatusBar
              state={state}
              message={statusMessage}
              audioLevel={audioLevel}
              onSettingsClick={() => setShowSettings(true)}
              onVoiceToggle={handleVoiceToggle}
              isRecording={mediaRecorderRef.current?.state === 'recording'}
            />
          </div>
        )}
      </div>

      <audio ref={audioRef} onEnded={() => sceneRef.current?.lipSync.stop()} />

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onToast={showToast}
          onModelChange={loadModelFromStorage}
          onSettingsSaved={() => {
            const cfg = ConfigManager.getConfig()
            sceneRef.current?.setGender(cfg.character_gender)
            setGender(cfg.character_gender)
            setPoseIndex(0)
            sceneRef.current?.setPose(0)
            applyGraphics()
          }}
        />
      )}

      <ToastContainer
        items={toasts}
        onDone={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {showLogs && <LogPanel onClose={() => setShowLogs(false)} />}

      <LoadingScreen
        visible={loading}
        progress={loadProgress}
        message={loadMsg}
      />
    </div>
  )
}
