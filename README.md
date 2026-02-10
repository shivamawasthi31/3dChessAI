# 3D Chess AI

A browser-based 3D chess game where you play against LLM-powered AI opponents. Built with Three.js and TypeScript.

## Features

- 3D chess board with custom Blender piece models
- Multi-LLM support: OpenAI, Anthropic, Google Gemini, Groq
- Real-time AI thinking panel with streamed reasoning
- Per-game memory and context window management
- Game history with PGN storage
- Play style selection: aggressive, defensive, balanced
- Built-in minimax fallback if LLM fails

## Setup

```bash
npm install
npm run start:dev
```

Open browser, click **AI Settings**, paste your API key, select provider/model, enable LLM, save, then **Start Game**.

## Build

```bash
npm run build:prod
```

## How It Works

1. You make a move on the 3D board
2. The board state (FEN) + move history is sent to your chosen LLM
3. The AI streams its reasoning in the thinking panel
4. The AI's chosen move is validated and animated on the board
5. If the LLM returns an invalid move, it retries up to 3x then falls back to minimax

## Supported Providers

| Provider | Models | Browser CORS |
|----------|--------|-------------|
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4 Turbo | Direct |
| Anthropic | Claude Sonnet 4, Claude 3.5 Haiku | Via header |
| Google Gemini | Gemini 2.0 Flash, Gemini 1.5 Pro | Direct |
| Groq | Llama 3.3 70B, Mixtral 8x7B | Direct |

## License

MIT
