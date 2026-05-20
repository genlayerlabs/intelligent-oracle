---
name: genlayer-cli
description: Use the GenLayer CLI to inspect, interact with, and debug this repo's intelligent contracts.
allowed-tools:
  - Bash
  - Read
---

# GenLayer CLI

Use this skill for local Studio management, account/network inspection, contract calls, receipts, and transaction debugging. For this repo's normal factory deployment, prefer the `deploy` skill, which runs the `scripts/` package.

## Setup

```bash
npm install -g genlayer
```

## Network Configuration

```bash
genlayer network set
genlayer network set studionet
genlayer network set localnet
genlayer network info
genlayer network list
```

Built-in networks include `localnet`, `studionet`, `testnet-asimov`, and `testnet-bradbury`.

Use `genlayer network set` for built-in networks. Avoid `--rpc` for built-ins because it can bypass chain metadata needed for polling and receipt decoding.

StudioNet is gasless. A zero GEN balance is normal there.

## Account Commands

```bash
genlayer account
genlayer account list
genlayer account create --name dev1
genlayer account use dev1
genlayer account unlock
genlayer account lock
genlayer account import --name imported --private-key 0x...
```

Headless environments may not support keychain unlock. Commands that sign transactions can prompt for a keystore password unless a deployment script uses env-based private keys.

## Repo Deployment Path

This repo deploys the registry factory through `scripts/deploy.ts` using `genlayer-js`:

```bash
cd scripts && npm run deploy
```

The deploy script reads:

- `scripts/.env` `PRIVATE_KEY`
- `scripts/.env` `RPC_URL`
- `intelligent-contracts/IntelligentOracleFactory.py`
- `intelligent-contracts/IntelligentOracle.py`

After deployment, copy the registry address into root app envs:

```text
IC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_IC_REGISTRY_ADDRESS=0x...
```

## Direct CLI Deployment

Avoid direct CLI deployment for the registry factory in normal work. The factory constructor needs the full oracle source code as an argument, and the `scripts/` package already handles that in the same way the project expects.

Use CLI deployment only for isolated experiments where the deployed contract does not need to match the app's registry flow.

## Contract Interaction

Read calls:

```bash
genlayer call <registry-address> get_contract_addresses
genlayer call <oracle-address> get_dict
genlayer call <oracle-address> get_status
```

Write calls:

```bash
genlayer write <oracle-address> resolve --args "https://example.com/evidence"
```

The registry write method used by the API is:

```text
create_new_prediction_market(
  prediction_market_id,
  title,
  description,
  potential_outcomes,
  rules,
  data_source_domains,
  resolution_urls,
  earliest_resolution_date
)
```

## Transaction Debugging

```bash
genlayer receipt <txHash>
genlayer receipt <txHash> --stdout
genlayer receipt <txHash> --stderr
genlayer receipt <txHash> --status FINALIZED --retries 50 --interval 3000
```

Debug order:

1. Inspect the receipt, stdout, and stderr.
2. Check schema with `genlayer schema <address>`.
3. Check deployed source with `genlayer code <address>`.
4. Compare method names and constructor args against the Next route handlers and `scripts/deploy.ts`.
5. Appeal only when a real consensus re-evaluation is intended.

## Local Studio

```bash
genlayer init
genlayer up
genlayer up --reset-db
genlayer stop
```

When switching to local Studio, update both server and browser envs in the root app:

```text
GENLAYER_RPC_URL=http://localhost:4000/api
NEXT_PUBLIC_GENLAYER_RPC_URL=http://localhost:4000/api
```
