# GenLayer Intelligent Oracle Assistant

## Overview

A whitelabel AI Assistant that walks users through configuring an Intelligent Oracle and deploys it with one click via the bridge backend.

## Features

- Interactive chat-driven oracle configuration
- Step-by-step parameter collection (title, outcomes, rules, data sources, resolution date)
- Real-time streaming responses (Vercel AI SDK v6, `Chat` + `DefaultChatTransport`)
- One-click deploy + explorer link
- Tailwind v4 + Nuxt 4

## Technologies

- Vue 3.5
- Nuxt 4
- Tailwind v4 (CSS-first config)
- Vercel AI SDK v6 (`ai`, `@ai-sdk/vue`)
- LLM via OpenRouter (default model: `openai/gpt-5-mini`) — provider lives in [`bridge/server/api/chat.ts`](../bridge/server/api/chat.ts)

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env`:
   ```
   NUXT_PUBLIC_CHAT_API_URL=http://localhost:3000/api/chat
   NUXT_PUBLIC_BRIDGE_API_URL=http://localhost:3000/api/bridge
   NUXT_PUBLIC_EXPLORER_URL=http://localhost:5173
   ```
3. Configure design tokens in `assets/css/main.css` (Tailwind v4 `@theme` block).

## Usage

1. Start the wizard:
   ```
   npm run dev
   ```
2. Open `http://localhost:3001` (Nuxt avoids 3000 if bridge is already there).
3. Follow the assistant's prompts to configure your oracle.

## Customization

- Change the assistant's behavior or initial system prompt: edit the `initialPrompt` constant in [`bridge/server/api/chat.ts`](../bridge/server/api/chat.ts).
- Brand colors / fonts: tweak the `@theme` tokens in `assets/css/main.css`.
