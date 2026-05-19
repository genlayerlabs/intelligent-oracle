# Intelligent Oracle

A reference Next.js app for creating, deploying, and monitoring AI-powered prediction-market oracles on GenLayer. Draft a market in plain English, sign the create transaction from your own wallet, and let validator consensus resolve it against live web evidence.

## What changed from the previous architecture

This repo previously shipped four moving parts behind a `docker-compose`: a Nuxt `bridge/` API, a Nuxt `ui-wizard/`, a Vite+Vue `explorer/`, and the GenLayer Python contracts. Everything UI- and runtime-related has been consolidated into a single Next.js 16 App Router app under `src/`:

- `bridge/` → `src/app/api/chat/route.ts` (Vercel AI SDK + OpenRouter, server-only key).
- `ui-wizard/` → `src/app/assistant` (AI-driven oracle drafting + live Market Draft panel).
- `explorer/` → `src/app/explorer` and `src/app/oracle/[address]`.
- `docker-compose.yml` → removed. Hosted GenLayer Studio (`https://studio.genlayer.com/api`) is the default; localnet is one env var away.
- Server-side bridge signer key → removed. Create and resolve transactions are signed by the user's connected wallet.

The Python contracts in `intelligent-contracts/` and the standalone deploy scripts in `scripts/` are unchanged.

## Prerequisites

1. Node.js 20.9+ and npm 10+
2. Python 3.12+ for contract tests
3. GenLayer CLI:
   ```bash
   npm install -g genlayer
   genlayer network set studionet
   ```

The hosted Studio network (`https://studio.genlayer.com/api`) is the default. For local development with a validator network, run `genlayer init` and point the GenLayer RPC env var at `http://localhost:4000/api`.

## Quickstart

```bash
npm install
cp .env.example .env
npm run dev
```

## Project Structure

- `src/app` — Next.js App Router UI and route handlers:
  - `/` — landing page
  - `/assistant` — AI-driven oracle drafting wizard
  - `/explorer` — registry of deployed oracles
  - `/oracle/[address]` — oracle detail, transaction inspection, and resolution
  - `/docs` — get-started guide
  - `/api/chat` — OpenRouter-backed streaming chat
- `src/components` — React UI for landing, docs, wizard, and explorer
- `src/lib` — shared validation, AI message parsing, GenLayer client hooks, and display helpers
- `intelligent-contracts/` — GenLayer Python contracts
- `scripts/` — separate npm package for factory deployment, kept outside root app commands
- `test/` — Python E2E tests and seed helpers

## Environment

Copy `.env.example` to `.env` and fill in:

```bash
# Server-only
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-5-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Bundled into the browser build
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

`OPENROUTER_*` values are server-only. GenLayer reads and writes use the browser-visible `NEXT_PUBLIC_*` values; write transactions are signed by the connected wallet.

## Verification

```bash
npm run check
```

`npm run check` runs lint, TypeScript, unit tests, and the production Next.js build.

Individual checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Contract tests (Python):

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r test/requirements.txt
python -m pytest test/
```

Contract linting:

```bash
genvm-lint check intelligent-contracts/IntelligentOracle.py
genvm-lint check intelligent-contracts/IntelligentOracleFactory.py
```

## Factory Deployment

The factory deploy script is a separate npm package and is user-invoked only.

```bash
cd scripts
npm install
cp .env.example .env
npm run deploy
```

The script deploys `IntelligentOracleFactory` with the `IntelligentOracle` source passed into its constructor, then prints the factory address. Paste that address into `NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS` in the root app's `.env`.

## Branding / Forking

Repo URL, owner name, and optional Discord invite are centralized in `src/lib/site-meta.ts`. Fork-and-deploy users should edit that one file to point at their own repo and branding.

## Tech Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4
- Vercel AI SDK v6 with `@ai-sdk/react` and `@openrouter/ai-sdk-provider`
- `genlayer-js` 1.x
- GenVM Python intelligent contracts

## License

MIT — see [`LICENSE`](./LICENSE).
