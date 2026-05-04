# Bridge & Chat API

## Overview

Backend for the Intelligent Oracle system. Two endpoints power everything:

1. **Bridge API** — deploys Intelligent Oracles through the on-chain factory
2. **Chat API** — streams natural-language assistance into the wizard via OpenRouter

## Features

### Bridge API
- Submits prediction-market specs to the GenLayer factory contract
- Signs transactions with a configured bridge key
- Waits on consensus, then surfaces the deployed oracle address

### Chat API
- Streams AI Assistant responses (Vercel AI SDK v6, `streamText` + `toUIMessageStreamResponse`)
- LLM provider configurable via `NUXT_LLM_BASE_URL` (default: OpenRouter, model `openai/gpt-5-mini`)
- Maintains conversation state in the wizard's local storage

## Technologies

- Nuxt 4 + Nitro (Vercel-ready)
- Vercel AI SDK v6 (`ai`, `@ai-sdk/openai`, `@openrouter/ai-sdk-provider`)
- GenLayer JS SDK 1.x (`genlayer-js`)

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   ```
   NUXT_LLM_BASE_URL=https://openrouter.ai/api/v1
   NUXT_LLM_API_KEY=...
   NUXT_LLM_API_MODEL=openai/gpt-5-mini
   NUXT_BRIDGE_PRIVATE_KEY=0x...
   NUXT_SIMULATOR_ENDPOINT=https://studio.genlayer.com/api
   NUXT_IC_REGISTRY_ADDRESS=0x...
   ```
3. Run dev:
   ```
   npm run dev
   ```
4. Open `http://localhost:3000` (port may shift if other Nuxt apps are running).

## API Reference

- `POST /api/chat` — send a message to the AI Assistant. Expects a UIMessage array (Vercel AI SDK shape) under `messages`.
- `POST /api/bridge/deploy-intelligent-oracle` — body matches `IntelligentOracleInput` in `server/api/bridge/deploy-intelligent-oracle.ts`.

## Notes

- The chat handler ships its system prompt server-side; clients no longer need to seed the conversation with it.
- Default RPC points at hosted Studio (`https://studio.genlayer.com/api`). Override `NUXT_SIMULATOR_ENDPOINT` for `localnet` or testnets.
