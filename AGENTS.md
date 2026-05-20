# AGENTS.md

Guidance for Codex agents working in this repository.

## Project Shape

This repo is a single root Next.js App Router application for creating and monitoring GenLayer intelligent oracles.

- `src/app` contains pages and route handlers:
  - `/`
  - `/assistant`
  - `/explorer`
  - `/oracle/[address]`
  - `/docs`
  - `/api/chat`
- `src/components` contains React UI components for the public landing/docs pages, wizard, and explorer.
- `src/lib` contains shared validation, AI message parsing, GenLayer client hooks, transaction normalization, and display helpers.
- `intelligent-contracts/` contains GenLayer Python contracts.
- `scripts/` is a separate npm package for factory deployment. Keep it separate from root app commands unless the user explicitly wants to deploy.
- `test/` contains Python direct-mode contract tests and helpers.

The old `bridge`, `explorer`, and `ui-wizard` app folders were intentionally removed during the Next.js migration. Do not recreate them.

## Commands

Root UI/API verification:

```bash
npm run check
```

Individual root checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Python contract tests:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r test/requirements.txt
python -m pytest test/ -v
```

GenVM lint:

```bash
genvm-lint check intelligent-contracts/*.py
```

Factory deployment is user-invoked only:

```bash
cd scripts && npm install && cp .env.example .env && npm run deploy
```

## Environment

Server-only env vars:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL`

None for GenLayer app writes. Users sign create and resolution transactions from their connected wallet.

Browser env vars:

- `NEXT_PUBLIC_GENLAYER_RPC_URL`
- `NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `NEXT_PUBLIC_PRIVY_CLIENT_ID` (optional)
- `NEXT_PUBLIC_IC_REGISTRY_ADDRESS`

`NEXT_PUBLIC_IC_REGISTRY_ADDRESS` is a legacy fallback during migration. Hosted Studio defaults to `https://studio.genlayer.com/api`. If using local Studio, update the browser GenLayer RPC env var.

## AI And GenLayer Boundaries

- Non-contract chat/assistant AI belongs in the root Next app using Vercel AI SDK and OpenRouter.
- Contract resolution AI stays inside GenLayer contracts through `gl.nondet.exec_prompt` and GenLayer equivalence principles.
- Do not move GenLayer contract AI calls into `/api/chat` or other Next route handlers.

## Contract ABI Caution

The app and deploy script depend on these public contract methods:

- Registry `__init__(intelligent_oracle_code: str)`
- Registry `create_new_prediction_market(...)`
- Registry `get_contract_addresses()`
- Oracle `__init__(prediction_market_id, title, description, potential_outcomes, rules, data_source_domains, resolution_urls, earliest_resolution_date)`
- Oracle `resolve(evidence_url: str = "")`
- Oracle `get_dict()`
- Oracle `get_status()`

If any of these change, update the GenLayer hooks, deploy script, and Python tests together.

## Local Guidance

- Prefer existing patterns in `src/lib` and `src/components`.
- Keep `/docs` as the branded Get Started page: try-it first, fork/deploy next, then compact reference sections.
- Use Zod schemas for user/API boundary validation.
- Keep route handlers in `src/app/api/**/route.ts`.
- Keep UI client behavior in client components.
- Do not run deployment commands as routine verification.
- `.claude/skills/` contains GenLayer-specific workflow notes adapted from `genlayerlabs/skills`; consult them when changing contracts, deployment behavior, or GenLayer testing.
- Project is dual-licensed (both files Copyright GenLayer Labs). Application code is MIT — see `LICENSE`. Landing/docs/brand assets (`src/app/(marketing)/`, `src/components/marketing/`, `src/components/brand/`, `public/brand/`, `public/icon.svg`) are all-rights-reserved — see `LICENSE.LANDING`. GenLayer name/logos are GenLayer Labs trademarks. Do not add per-file license headers.
- Brand strings (GitHub URL, owner name, optional Discord) live in `src/lib/site-meta.ts`. Edit that file rather than hardcoding URLs in components or docs.

## Wizard Invariants (do not regress)

The Market Draft panel in `src/components/wizard/wizard-page.tsx` has rules that have been bug-fixed once already. Preserve them:

1. **Two validators, two purposes.** `parseOracleDraft` from `src/lib/oracle-config.ts` drives field-level error display (only flags present-but-malformed values). `parseOracleConfig` drives the deploy gate and paste-import. Never display strict-required errors when the field is empty and untouched.
2. **Errors gated by `visibleErrorKeys`.** Strict-required field errors only render once the field is in `touchedFields` (marked on blur, not on change), in `aiAttemptedKeys` (AI either populated it or returned a fully invalid draft), or `submitAttempted` was set by a Create click.
3. **Never clobber edits.** The `userHasEdited` flag gates whether a new AI draft auto-applies or queues as a pending banner. Don't replace this with focus-based or always-pending logic.
4. **Tool calls never silent.** The assistant prompt requires text alongside every `proposeOracleConfig` call; `synthesizeDraftConfirmation` in `MessageParts` is the UI fallback. Keep both.
5. **Sources tab toggle is non-destructive.** `switchMode` must not clear `dataSourceDomains` or `resolutionURLs`. The inactive list is cleared by `commitActiveMode` only when the user types non-empty content into the active list.

## Conventions

Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
