---
name: genvm-lint
description: Validate this repo's GenLayer intelligent contracts with the GenVM linter.
allowed-tools:
  - Bash
  - Read
---

# GenVM Lint

Use this skill whenever `intelligent-contracts/*.py` changes or when contract ABI/storage behavior is relevant.

Contracts in this repo live in:

- `intelligent-contracts/IntelligentOracle.py`
- `intelligent-contracts/IntelligentOracleFactory.py`

## Setup

The linter is expected to be available as `genvm-lint`. If it is missing:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install genvm-linter
```

## Required Workflow

Run lint before contract tests and before deployment:

```bash
genvm-lint check intelligent-contracts/IntelligentOracle.py
genvm-lint check intelligent-contracts/IntelligentOracleFactory.py
```

For all contracts:

```bash
genvm-lint check intelligent-contracts/*.py
```

Use JSON output when fixing multiple errors:

```bash
genvm-lint check intelligent-contracts/*.py --json
```

## Useful Commands

Fast AST checks only:

```bash
genvm-lint lint intelligent-contracts/*.py
```

SDK semantic validation:

```bash
genvm-lint validate intelligent-contracts/*.py
```

Schema and ABI inspection:

```bash
genvm-lint schema intelligent-contracts/IntelligentOracle.py --json
genvm-lint schema intelligent-contracts/IntelligentOracleFactory.py --json
```

Pyright-backed type checking:

```bash
genvm-lint typecheck intelligent-contracts/*.py
```

## What To Watch

- Keep storage fields as class-level type annotations.
- Use GenLayer storage types such as `DynArray` and `TreeMap`; do not persist Python `list` or `dict`.
- Preserve the constructor shape used by `scripts/deploy.ts` and `src/app/api/bridge/deploy-intelligent-oracle/route.ts`.
- Preserve public method names used by the UI: `get_contract_addresses`, `create_new_prediction_market`, `get_dict`, `get_status`, and `resolve`.
- Treat linter failures as blockers for deploy unless the user explicitly asks for exploratory work.
