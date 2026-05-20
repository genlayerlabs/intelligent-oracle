---
name: integration-tests
description: Run or design live-environment GenLayer tests for this intelligent-oracle repo.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Integration Tests

Use this skill when contract behavior must be checked against a real GenLayer environment such as hosted Studio, local Studio, or a testnet.

The routine Python suite in this repo is direct-mode pytest under `test/`. There is currently no committed `gltest.config.yaml` or `tests/integration/` scaffold. Do not invent one for routine verification unless the user asks for live integration coverage.

## Current Repo Defaults

- Contract sources: `intelligent-contracts/`
- Factory deploy package: `scripts/`
- Hosted Studio RPC default: `https://studio.genlayer.com/api`
- Root app RPC envs: `GENLAYER_RPC_URL` and `NEXT_PUBLIC_GENLAYER_RPC_URL`
- Registry envs: `IC_REGISTRY_ADDRESS` and `NEXT_PUBLIC_IC_REGISTRY_ADDRESS`

## Live Smoke Test Options

Deploy the registry factory only when the user intends to write on-chain state:

```bash
cd scripts && npm install && cp .env.example .env && npm run deploy
```

Use the root Next app to exercise live create/resolve flows after env vars are configured:

```bash
npm run dev
```

Manual live checks:

- `/` creates a valid oracle config and calls `/api/bridge/deploy-intelligent-oracle`.
- `/explorer` reads registry oracles through `NEXT_PUBLIC_GENLAYER_RPC_URL`.
- `/oracle/[address]` reads `get_dict`, polls transactions, and calls `resolve`.

## Optional gltest Scaffold

Only add `gltest` integration tests when explicitly requested. If added, keep them separate from direct tests, for example:

```text
tests/integration/
  test_oracle_live_flow.py
gltest.config.yaml
```

The config should point `contract_path` at `intelligent-contracts/`, not a generic `contracts/` folder.

Example shape:

```yaml
contract_path: intelligent-contracts/

networks:
  studionet: {}
  localnet: {}
```

Run with visible output:

```bash
gltest tests/integration/ -v -s --network studionet
```

## When Live Tests Are Worth It

- Consensus validation involving leader and validators.
- Real web requests and LLM calls inside `IntelligentOracle.resolve`.
- Pre-deployment smoke tests.
- Verifying the deployed registry and oracle ABI consumed by the Next UI.

Direct mode should cover most deterministic logic. Live tests are slower and can depend on external services, so keep them intentional.
