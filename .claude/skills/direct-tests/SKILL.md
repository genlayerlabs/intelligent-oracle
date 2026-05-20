---
name: direct-tests
description: Write and run fast direct-mode pytest tests for this repo's GenLayer intelligent contracts.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Direct Mode Tests

Use this skill for fast contract logic checks that do not need a live GenLayer network.

This repo keeps Python contract tests in `test/`, not `tests/direct/`. The tests use the `genlayer-test` pytest plugin fixtures plus helpers in `test/tools/`.

## Setup

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r test/requirements.txt -q
```

`test/requirements.txt` includes `genlayer-test`, which provides the `direct_*` pytest fixtures.

## Running Tests

Run all Python contract tests:

```bash
python -m pytest test/ -v
```

Run one file or one scenario:

```bash
python -m pytest test/test_football_prediction_market_with_evidence_success.py -v
python -m pytest test/test_football_prediction_market_with_evidence_success.py::test_name -v
```

Always lint contracts first when contract files changed:

```bash
genvm-lint check intelligent-contracts/*.py
```

## Repo Fixtures And Helpers

Existing tests use direct-mode fixtures such as:

```python
def test_example(direct_vm, direct_deploy, direct_alice, tmp_path):
    ...
```

Common fixtures include `direct_vm`, `direct_deploy`, `direct_alice`, `direct_bob`, `direct_charlie`, `direct_owner`, and `direct_accounts`.

Use `test/tools/contracts.py` for repo-specific helpers:

- `ORACLE_CONTRACT_PATH`
- `deploy_oracle_direct(...)`
- `mock_oracle_resolution(...)`
- `read_contract_source(...)`

`deploy_oracle_direct(...)` rewrites the contract header to `py-genlayer-multi:test` for direct-mode compatibility. Prefer using that helper instead of duplicating deploy setup.

## Mocking External Inputs

For `gl.nondet.web.get()`:

```python
direct_vm.mock_web(r".*", {"status": 200, "body": b"<html>result</html>"})
```

For `gl.nondet.exec_prompt()`:

```python
direct_vm.mock_llm(
    r".*",
    json.dumps(
        {
            "valid_source": "true",
            "event_has_occurred": "true",
            "reasoning": "mocked direct-mode resolution",
            "outcome": "Bayern Munich",
        }
    ),
)
```

Reset mocks between scenarios when needed:

```python
direct_vm.clear_mocks()
```

## What To Test Here

- Constructor validation for required fields, unique outcomes, and source mode exclusivity.
- Evidence URL domain checks.
- Resolution success, `UNDETERMINED`, `ERROR`, and revert paths.
- Public view output shape consumed by the Next explorer.
- Factory deployment behavior when it creates oracle contracts.

Direct mode runs the leader path only. Use integration tests or a live Studio smoke test when validator consensus behavior is the thing being verified.
