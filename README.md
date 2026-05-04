# Intelligent Oracle System

A complete reference app for deploying and managing AI-powered oracles on GenLayer. Multi-module: chat-based wizard for spec generation, bridge backend, monitoring explorer, and the on-chain factory + per-market contracts.

## Prerequisites

1. **Node.js 20+** and **npm 10+**
2. **Python 3.12+** (for tests and contract linting)
3. **GenLayer CLI**:
   ```bash
   npm install -g genlayer
   genlayer network set studionet
   ```
   Networks: `localnet`, `studionet` (https://studio.genlayer.com), `testnet-asimov`, `testnet-bradbury`. The hosted Studio (`studionet`) is the default this repo points at — no local stack required.

   For local development with a real validator network, run `genlayer init` to bring up Studio locally, then point each module's RPC env var at `http://localhost:4000/api`.

4. **Contract linting** (optional but recommended):
   ```bash
   pip install genvm-linter
   genvm-lint setup
   ```

## Project Components

### 1. Intelligent Contracts — [`/intelligent-contracts`](/intelligent-contracts)
- `IntelligentOracle.py` — per-market oracle resolved via LLM consensus
- `IntelligentOracleFactory.py` — registry + factory
- Built on the current GenLayer SDK (`gl.Contract` subclass form, `gl.eq_principle.prompt_comparative`, `gl.nondet.web.get`)

### 2. Bridge & Chat API — [`/bridge`](/bridge)
- Nuxt 4 Nitro server, Vercel-ready
- `POST /api/chat` — OpenRouter-backed chat (default model `openai/gpt-5-mini`) for the wizard
- `POST /api/bridge/deploy-intelligent-oracle` — submits a market through the factory

### 3. Configuration Wizard UI — [`/ui-wizard`](/ui-wizard)
- Nuxt 4, AI SDK v6 (`Chat` class with `DefaultChatTransport`)
- Step-by-step oracle configuration via natural language
- One-click deploy through the bridge

### 4. Explorer — [`/explorer`](/explorer)
- Vite 8 + Vue 3.5, Tailwind v4
- Lists markets registered in the factory
- Detail view with transaction inspection

### 5. Deploy script — [`/scripts`](/scripts)
- `deploy.ts` — deploys the factory on `studionet` (or whatever `RPC_URL` points at)

## Getting Started

```bash
# Per-module install + dev (no Docker needed)
cd bridge && npm install && cp .env.example .env && npm run dev
cd ui-wizard && npm install && cp .env.example .env && npm run dev
cd explorer && npm install && cp .env.example .env && npm run dev

# Deploy the factory
cd scripts && npm install && cp .env.example .env && npm run deploy

# Lint the contracts
genvm-lint check intelligent-contracts/IntelligentOracle.py
genvm-lint check intelligent-contracts/IntelligentOracleFactory.py

# Tests
pip install -r test/requirements.txt
pytest test/
```

## Architecture

```
├── intelligent-contracts/  # GenLayer Python contracts (factory + per-market)
├── bridge/                 # Nuxt 4 backend (chat + deploy endpoints)
├── ui-wizard/              # Nuxt 4 wizard frontend
├── explorer/               # Vite 8 monitoring dashboard
├── scripts/                # Factory deployment script
└── test/                   # Python E2E tests
```

## Contributing

Contributions welcome. Each module has its own README with development specifics.

## License

MIT
