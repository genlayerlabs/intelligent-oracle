# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

GenLayer Intelligent Oracle system — a single Next.js application for creating, deploying, and monitoring prediction-market oracles powered by GenLayer intelligent contracts. The app targets hosted GenLayer Studio (`studionet` — `https://studio.genlayer.com/api`) by default and can be pointed at localnet or testnets via env vars.

## Module Structure

- `src/app` — Next.js App Router UI and route handlers, including `/`, `/assistant`, `/explorer`, `/oracle/[address]`, `/docs`, and `/api/chat`.
- `/docs` — branded Get Started page: try the hosted assistant first, then fork/deploy steps, then compact reference details.
- `src/components` — React UI components for the public landing/docs pages, assistant wizard, and explorer.
- `src/lib` — shared validation, AI message parsing, GenLayer hooks, and display helpers.
- `intelligent-contracts/` — GenLayer Python contracts using `gl.Contract`, `gl.eq_principle.prompt_comparative`, `gl.nondet.web.render` (mode=text, wait_after_loaded=10s) for HTML sources, and `gl.nondet.exec_prompt`.
- `scripts/` — separate npm package for factory deployment using `genlayer-js` 1.x. Keep it outside root app commands unless the user explicitly wants to deploy.
- `test/` — Python E2E tests and seed helpers.

## Build & Run

```bash
npm install
cp .env.example .env
npm run dev

npm run lint
npm run typecheck
npm run test
npm run build

# Or run the standard root verification sequence:
npm run check
```

Deploy contracts with:

```bash
cd scripts && npm install && cp .env.example .env && npm run deploy
```

## Claude Skills

Project-specific skills live in `.claude/skills/`. The GenLayer development skills were adapted from `genlayerlabs/skills` for this repo's layout:

- `write-contract` — edit `intelligent-contracts/` safely and keep the app/deploy ABI aligned.
- `genvm-lint` — run GenVM lint/schema/type checks against `intelligent-contracts/*.py`.
- `direct-tests` — run and extend direct-mode pytest coverage under `test/`.
- `integration-tests` — plan intentional live Studio/testnet checks without treating them as routine verification.
- `genlayer-cli` — inspect networks, accounts, receipts, schemas, and deployed contracts.
- `deploy` — user-invoked factory deployment through the separate `scripts/` package.
- `verify` — standard root verification plus optional Python contract tests.

## Environment

- Server-only: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`. Used by `src/app/api/chat/route.ts` only.
- Browser: `NEXT_PUBLIC_GENLAYER_RPC_URL`, `NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. `NEXT_PUBLIC_IC_REGISTRY_ADDRESS` is a legacy fallback during migration.
- Default RPC targets hosted Studio (`https://studio.genlayer.com/api`). Override the public RPC env var for localnet or testnets. Wallet signing replaces any server-side bridge key — there is no bridge route or `BRIDGE_PRIVATE_KEY`.

## Tech Stack

- Frontend/runtime: Next.js 16 App Router, React 19, Tailwind v4.
- AI: Vercel AI SDK v6, `@ai-sdk/react`, `@openrouter/ai-sdk-provider`. Default model `openai/gpt-5-mini`.
- GenLayer: `genlayer-js` 1.x plus Python GenVM contracts.
- Tests: Vitest for shared TypeScript helpers, pytest for contract E2E.

## Wizard Architecture (`src/components/wizard/wizard-page.tsx`)

The wizard pairs a chat panel with a live "Market Draft" panel. Important rules to preserve:

- **Two-tier validation** (`src/lib/oracle-config.ts`).
  - `parseOracleDraft` (permissive, optional fields) drives per-field error display for *present-but-malformed* values.
  - `parseOracleConfig` (strict) drives the deploy gate, paste-import dialog, and the AI tool's `evaluateOracleConfig` server-side check.
  - Never run the strict schema against `OracleConfigCandidate` for display — that's what produced the original "Invalid input: expected string, received undefined" red-on-empty bug.
- **Error visibility gating.** Strict-required errors only render for keys in `visibleErrorKeys = touchedFields ∪ aiAttemptedKeys ∪ (submitAttempted ? ALL : ∅)`. `touchedFields` is marked **on blur**, not on change. AI-attempted is derived from the streaming candidate or set to ALL when the AI returns `status: "invalid"`.
- **Never clobber user edits.** The auto-apply effect uses `userHasEdited` to decide between auto-apply and pending-banner. Manual edits set the flag; `applyPendingDraft` and session reset clear it. Initial drafts and refinements when the user hasn't typed anything auto-apply silently.
- **Chat is never silent on a tool call.** The system prompt requires the AI to write text alongside every `proposeOracleConfig` call. If the model still skips it, `synthesizeDraftConfirmation` in `MessageParts` renders a synthetic confirmation line from the tool output. Don't remove the fallback even if the prompt seems "good enough".
- **Sources field is commit-on-content.** Tab clicks between Domains / URLs are non-destructive. The inactive list is cleared only when the user types non-empty content into the active list. Don't add destructive `onUrlsChange([])` / `onDomainsChange([])` calls back into `switchMode`.

## Assistant Prompt (`src/lib/assistant-prompt.ts`)

Behavioral contract the AI is held to:

- Draft on the first turn whenever a topic is supplied. Use sensible defaults rather than asking. Refinement chips ("Add another source domain", "Tighten the rule", "Push the date back") are commitments, not questions — pick a specific change and re-draft.
- Every `proposeOracleConfig` call MUST be paired with a short text reply naming what changed and inviting edits on the right. This is enforced both by prompt and by the UI fallback in `MessageParts`.
- Source defaults: `coingecko.com` for crypto, `espn.com` for sports, national meteorological agency or `weather.com` for weather, electoral authority or `apnews.com` for politics.

## Git Conventions

Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.

## License

MIT — see `LICENSE`. Do not add per-file license headers. Brand/URL constants live in `src/lib/site-meta.ts` — edit there rather than hardcoding in components.
