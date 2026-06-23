# AI Vtuber

Aplicação desktop VTuber que exibe um personagem 3D na tela, ouve entrada do usuário (texto ou voz), processa via IA e responde com voz sincronizada com movimentos labiais e expressões faciais.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-31-47848F?style=flat&logo=electron&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r169-000000?style=flat&logo=three.js&logoColor=white)

## Funcionalidades

- **Personagem 3D** — Renderiza modelos VRM com Three.js, com iluminação, sombras e animações
- **Chat por texto** — Digite mensagens e receba respostas da IA
- **Entrada de voz** — Grave o microfone e transcreva com Whisper
- **Resposta em voz** — TTS via OpenAI ou ElevenLabs com sincronia labial
- **Expressões faciais** — O LLM controla emoções do personagem via tags: `{feliz}`, `{triste}`, `{surpreso}`, `{bravo}`
- **Captura de tela** — O personagem pode "ver" sua tela via GPT-4o Vision
- **Personalidade** — Configure gênero, estilo de fala e prompt de sistema (português)
- **7 abas de configuração** — APIs, provedores, voz, personagem, modelo 3D, comportamento e tutorial

## Stack

| Camada | Tecnologia |
|---|---|
| Desktop | Electron 31 |
| Frontend | React 18 + TypeScript |
| 3D | Three.js r169 + @pixiv/three-vrm 3.1 |
| IA | OpenAI, Anthropic Claude, ElevenLabs |
| Build | Vite 5 + electron-builder |

## Pré-requisitos

- Node.js 18+
- npm
- Chave de API da OpenAI (obrigatório para funcionamento básico)

## Instalação

```bash
git clone https://github.com/RodrigoChantelHora/ai-vtuber-electron.git
cd ai-vtuber-electron
npm install
```

## Desenvolvimento

```bash
npm run electron:dev
```

Inicia Vite com hot reload + Electron.

## Build

```bash
npm run electron:build
```

Gera o instalável para a plataforma atual:
- **Linux:** AppImage
- **Windows:** NSIS installer
- **macOS:** DMG

> Para build no Windows, execute no Windows nativo (não WSL) ou instale Wine no Linux.

## Uso

1. Abra o aplicativo
2. Pressione `F1` para abrir configurações
3. Insira sua chave da OpenAI (e opcionalmente Anthropic/ElevenLabs)
4. Importe um modelo VRM (ou use o personagem placeholder padrão)
5. Comece a conversar por texto ou pressione `V` para falar

## Atalhos

| Tecla | Ação |
|---|---|
| `F1` | Abrir configurações |
| `V` | Gravar voz |
| `Escape` | Limpar histórico |

## Estrutura

```
ai_vtuber_electron/
├── electron/          # Processo principal e preload
├── src/
│   ├── components/    # Componentes React
│   ├── services/      # Serviços de IA (LLM, STT, TTS, Vision)
│   ├── three/         # Cena 3D, lip sync, expressões
│   └── styles/        # Estilos globais
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```
