import { useState, useEffect, useRef, useCallback } from 'react'
import { ConfigManager } from './services/ConfigManager'
import { askLLM, clearHistory } from './services/LLMService'
import { synthesizeSpeech } from './services/TTSService'
import { transcribeAudio } from './services/STTService'
import { describeImage } from './services/VisionService'
import { Scene3D } from './three/Scene3D'
import { ExpressionManager } from './three/ExpressionManager'
import { TitleBar } from './components/TitleBar'
import { SettingsPanel } from './components/SettingsPanel'
import { ChatBubble } from './components/ChatBubble'
import { TextInput } from './components/TextInput'
import { StatusBar } from './components/StatusBar'
import { Toast } from './components/Toast'
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
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null)
  const [statusMessage, setStatusMessage] = useState('Pronto')
  const [audioLevel, setAudioLevel] = useState(0)

  const sceneRef = useRef<Scene3D | null>(null)
  const threeContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const isProcessingRef = useRef(false)
  const chunksRef = useRef<Blob[]>([])

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() })
  }, [])

  useEffect(() => {
    ConfigManager.load()
  }, [])

  const loadModelFromStorage = useCallback(async () => {
    const scene = sceneRef.current
    if (!scene) return
    const modelInfo = await window.electronAPI?.getLoadedModel()
    if (modelInfo?.data) {
      try {
        await scene.loadVRMFromData(modelInfo.data)
      } catch {
        scene.loadDefaultModel()
      }
    } else {
      scene.loadDefaultModel()
    }
  }, [])

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

      const audioData = await synthesizeSpeech(cleanText)
      if (audioData && audioRef.current) {
        const blob = new Blob([audioData], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        audioRef.current.src = url
        sceneRef.current?.lipSync.start(audioRef.current)
        await audioRef.current.play()
      }

      setState('idle')
      setStatusMessage('Pronto')
      sceneRef.current?.expressions.setExpression('neutral')

      setTimeout(() => setBubbleText(''), 5000)
    } catch (err: any) {
      showToast(`Erro: ${err.message}`)
      setState('idle')
      setStatusMessage('Erro')
      sceneRef.current?.expressions.setExpression('sad')
      setBubbleText('Desculpe, algo deu errado.')
    } finally {
      isProcessingRef.current = false
    }
  }, [showToast])

  const handleVoiceToggle = useCallback(async () => {
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
      showToast(`Erro microfone: ${err.message}`)
    }
  }, [processInput, showToast])

  const handleTextSubmit = useCallback((text: string) => {
    setBubbleText(text)
    processInput(text)
  }, [processInput])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setShowSettings((s) => !s) }
      if (e.key === 'v' || e.key === 'V') { e.preventDefault(); handleVoiceToggle() }
      if (e.key === 'Escape') { e.preventDefault(); clearHistory(); showToast('Histórico limpo') }
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
      <TitleBar
        onMinimize={() => window.electronAPI?.minimize()}
        onMaximize={() => window.electronAPI?.maximize()}
        onClose={() => window.electronAPI?.close()}
      />

      <div className="main-area">
        <div className="three-container" ref={threeContainerRef}>
          <ChatBubble text={bubbleText} isThinking={state === 'thinking'} />
        </div>

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
      </div>

      <audio ref={audioRef} onEnded={() => sceneRef.current?.lipSync.stop()} />

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onToast={showToast}
          onModelChange={loadModelFromStorage}
        />
      )}

      {toast && (
        <Toast key={toast.key} message={toast.message} onDone={() => setToast(null)} />
      )}
    </div>
  )
}
