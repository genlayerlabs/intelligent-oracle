# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GenLayer Intelligent Oracle system — multi-module project for creating and monitoring blockchain oracles powered by LLM-based resolution. Targets the hosted GenLayer Studio (`studionet` — `https://studio.genlayer.com/api`) by default; can be pointed at `localnet`, `testnet-asimov`, or `testnet-bradbury` via env vars.

## Module Structure

- **bridge/** — Nuxt 4 backend API. Chat endpoint via OpenRouter (`@openrouter/ai-sdk-provider` + Vercel AI SDK v6); bridge endpoint that deploys oracles through the on-chain factory using `genlayer-js` 1.x. Vercel-ready.
- **explorer/** — Vite 8 + Vue 3.5 + Pinia 3 monitoring dashboard. Tailwind v4 (CSS-first config).
- **ui-wizard/** — Nuxt 4 configuration wizard. Uses `@ai-sdk/vue` v3's `Chat` class with `DefaultChatTransport`. Default LLM model is `openai/gpt-5-mini` via OpenRouter (configured server-side in `bridge/`).
- **intelligent-contracts/** — GenLayer Python contracts using the current SDK (`class X(gl.Contract):`, `gl.eq_principle.prompt_comparative`, `gl.nondet.web.get`, `gl.nondet.exec_prompt`).
- **scripts/** — TypeScript factory deployment using `genlayer-js` 1.x against `studionet` by default.
- **test/** — Python E2E tests (raw `pytest` + `requests`). Migration to `gltest` is open work.

## Build & Run

- **Per-module dev:** `npm install && npm run dev` in `bridge/`, `explorer/`, or `ui-wizard/` after copying `.env.example` to `.env`.
- **Deploy contracts:** `cd scripts && npm install && cp .env.example .env && npm run deploy`
- **Local validator network (optional):** `genlayer init` brings up Studio locally; point each module's RPC env at `http://localhost:4000/api`.

There is no longer a Docker stack in this repo — the previous `docker-compose.yml` ran the legacy v0.16 GenLayer Simulator and was removed in favor of hosted Studio + `genlayer init` for local dev.

## Testing & Linting

```bash
# Python E2E
pip install -r test/requirements.txt
pytest test/

# Contract lint (requires `pip install genvm-linter && genvm-lint setup` once)
genvm-lint check intelligent-contracts/IntelligentOracle.py
genvm-lint check intelligent-contracts/IntelligentOracleFactory.py
```

## Environment

Each module has its own `.env.example`. Network defaults point at `https://studio.genlayer.com/api`; override per-module if you're running locally or on testnets.

**Gotcha:** `VITE_CONTRACT_ADDRESS` in the explorer is read at Vite build time — change it and re-run `npm run dev`.

## Tech Stack

- **Contracts:** Python on GenVM. Subclass `gl.Contract`, typed `DynArray`/`TreeMap` storage, equivalence via `gl.eq_principle.prompt_comparative` or custom validators.
- **Frontend:** Vue 3.5 + Tailwind v4. Nuxt 4 for `bridge/` and `ui-wizard/`, Vite 8 for `explorer/`.
- **Backend:** Nuxt 4 Nitro (30s function timeout for Vercel deploys).
- **SDKs:** `genlayer-js` 1.x, `ai` v6, `@ai-sdk/openai`, `@ai-sdk/vue`, `@openrouter/ai-sdk-provider`.

## Git Conventions

Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.

## Monorepo Notes

No root `package.json` — each module manages its own deps. All four JS modules use npm with pinned major-version-current packages. Subdirectory `CLAUDE.md` files can be added for module-specific instructions if needed.
