# AI Vtuber — Contexto do Projeto

## Visão Geral

Aplicação desktop VTuber que exibe um personagem 3D na tela, ouve entrada do usuário (texto ou voz), processa via IA (LLM) e responde com voz sincronizada com lábios e expressões faciais.

## Stack

| Camada | Tecnologia |
|---|---|
| Desktop | Electron 31 |
| Frontend | React 18 + TypeScript |
| Bundler | Vite 5 + vite-plugin-electron |
| 3D | Three.js r169 + @pixiv/three-vrm 3.1 |
| Estilo | CSS puro |
| IA | OpenAI (GPT-4o, Whisper, TTS), Anthropic (Claude), ElevenLabs (TTS) |
| Pack | electron-builder (Linux AppImage, Windows NSIS, macOS DMG) |

## Arquitetura (3 processos)

```
Main Process (electron/main.ts)
  └── Cria BrowserWindow (frameless, 1280x800)
  └── IPC handlers: capture-screen, import-vrm, get-loaded-model,
                    remove-model, minimize/maximize/close
  └── contextIsolation: true, nodeIntegration: false

Preload (electron/preload.ts)
  └── contextBridge → window.electronAPI

Renderer (React SPA)
  └── App.tsx — orquestrador
      ├── TitleBar — controles de janela
      ├── ChatBubble — bolha de fala
      ├── TextInput — campo de texto
      ├── StatusBar — status, mic, settings
      ├── SettingsPanel — modal de config (7 abas)
      ├── Toast — notificações
      ├── Scene3D — cena Three.js/VRM
      │   ├── LipSyncController — animação da boca via áudio
      │   └── ExpressionManager — expressões faciais (VRM blend shapes)
      ├── ConfigManager — persistência (localStorage)
      ├── LLMService — OpenAI/Anthropic
      ├── STTService — Whisper
      ├── TTSService — OpenAI TTS / ElevenLabs
      └── VisionService — GPT-4o vision
```

## Fluxo de Dados

```
Voz → STTService (Whisper) → texto
Texto → [opcional: VisionService → contexto da tela]
      → LLMService (GPT-4o/Claude) → resposta
      → stripEmotionTags() → ChatBubble
      → extractEmotion() → ExpressionManager → VRM
      → TTSService → áudio → LipSyncController → VRM
```

## Estados da App

`idle` → `listening` → `thinking` → `talking` → `idle`

## Tags de Emoção

O LLM pode incluir no texto: `{feliz}`, `{triste}`, `{surpreso}`, `{bravo}` → mapeiam para VRM blend shapes.

## Configuração (localStorage)

Todas as chaves de API e preferências salvas em `localStorage` (`ai-vtuber-config`). Nenhum `.env` — config é feita pela UI (SettingsPanel).

### APIs necessárias
- **OpenAI** (obrigatório): LLM, STT, TTS, Vision
- **Anthropic** (opcional): LLM alternativo
- **ElevenLabs** (opcional): TTS alternativo

### Personalidade (pt-BR)
- Gênero: masculino / feminino / neutro
- Estilo: fofo / jovem_girias / jovem_girias_cheio / educado / rispido
- System prompt customizável

## Building

```bash
npm run electron:build   # vite build + electron-builder
```

Alvos: `win: nsis`, `mac: dmg`, `linux: AppImage`

Para build Windows, rode no Windows nativo (não WSL) ou instale `wine` no Linux.

## Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Vite dev server (web) |
| `npm run electron:dev` | Vite + Electron (hot reload) |
| `npm run electron:build` | Build produção |
| `npm run build` | tsc + vite + electron-builder |

## Atalhos de Teclado

| Tecla | Ação |
|---|---|
| `F1` | Abrir configurações |
| `V` | Gravar voz |
| `Escape` | Limpar histórico |

## Estrutura de Arquivos

```
ai_vtuber_electron/
├── electron/
│   ├── main.ts            — processo principal Electron
│   └── preload.ts         — ponte segura entre processos
├── src/
│   ├── main.tsx           — entry point React
│   ├── App.tsx            — componente raiz (orquestrador)
│   ├── App.css
│   ├── types.ts           — tipos globais (Window.electronAPI)
│   ├── styles/
│   │   └── global.css     — reset/estilos globais
│   ├── components/
│   │   ├── TitleBar.tsx/css
│   │   ├── StatusBar.tsx/css
│   │   ├── SettingsPanel.tsx/css  (7 abas)
│   │   ├── TextInput.tsx/css
│   │   ├── ChatBubble.tsx/css
│   │   └── Toast.tsx/css
│   ├── services/
│   │   ├── ConfigManager.ts   — persistência localStorage
│   │   ├── LLMService.ts      — OpenAI / Anthropic
│   │   ├── STTService.ts      — Whisper
│   │   ├── TTSService.ts      — OpenAI TTS / ElevenLabs
│   │   └── VisionService.ts   — GPT-4o vision
│   └── three/
│       ├── Scene3D.ts         — cena Three.js + VRM
│       ├── LipSyncController.ts — lip sync via áudio
│       └── ExpressionManager.ts — expressões VRM
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── AGENTS.md (este arquivo)
```

## Observações Importantes

- `webSecurity: false` no Electron — CORS desabilitado (necessário para blob URLs do VRM)
- API keys em plaintext no localStorage — sem criptografia
- `react-icons` é dependência mas **não é usado** — tudo usa Unicode
- UI inteira em português brasileiro
- Sem roteamento — SPA com settings como modal
- Sem gerenciador de estado — apenas React state/refs
- O diretório de modelos VRM é o primeiro `.vrm` encontrado em `userData/models/`
