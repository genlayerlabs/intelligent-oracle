# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GenLayer Intelligent Oracle system — multi-module project for creating and monitoring blockchain oracles powered by LLM-based resolution.

## Module Structure

- **bridge/** — Nuxt 3 backend API (OpenAI integration, GenLayer SDK, Vercel deployment)
- **explorer/** — Vite 5 + Vue 3 + Pinia monitoring dashboard
- **ui-wizard/** — Nuxt 3 configuration wizard with GPT-4 assisted oracle creation
- **intelligent-contracts/** — GenLayer Python smart contracts (IntelligentOracle, IntelligentOracleFactory)
- **scripts/** — TypeScript contract deployment utilities (genlayer-js SDK)
- **test/** — Python E2E tests (pytest)

## Build & Run

- **Full local stack:** `docker-compose up --build` (requires GenLayer Studio with Docker 26+)
- **Individual modules:** `npm run dev` in bridge/, explorer/, or ui-wizard/
- **Deploy contracts:** `cd scripts && npm run deploy`

## Testing

```bash
pip install -r test/requirements.txt
pytest test/
```

## Environment

Each module has its own `.env.example` — copy to `.env` and fill in values. Root `.env` is used by Docker Compose.

**Gotcha:** `VITE_CONTRACT_ADDRESS` is baked in at explorer container startup. Restart the explorer container after changing it.

## Tech Stack

- **Contracts:** Python targeting GenVM (genlayer decorators, DynArray storage, LLM-powered resolution)
- **Frontend:** Vue 3 + Tailwind CSS (Nuxt for bridge/ui-wizard, Vite for explorer)
- **Backend:** Nuxt 3 Nitro server (Vercel-ready, 30s function timeout)
- **SDKs:** genlayer-js, @ai-sdk/openai, Vercel AI SDK

## Git Conventions

Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

## Monorepo Notes

No root package.json — each module manages its own dependencies. bridge and ui-wizard use npm; explorer uses npm. No shared workspace config.

Subdirectory CLAUDE.md files can be added for module-specific instructions if needed.
