---
name: write-contract
description: Write production-quality GenLayer intelligent contracts for this intelligent-oracle repo.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# Write Intelligent Contract

Use this skill for changes under `intelligent-contracts/`.

This repo has two GenLayer contracts:

- `IntelligentOracle.py` stores prediction-market oracle config and resolves outcomes.
- `IntelligentOracleFactory.py` is the registry/factory used by the Next API deploy route and the explorer.

Always run:

```bash
genvm-lint check intelligent-contracts/*.py
python -m pytest test/ -v
```

## Repo Contracts

Preserve the public ABI consumed by the app:

- Registry `__init__(intelligent_oracle_code: str)`
- Registry `create_new_prediction_market(...)`
- Registry `get_contract_addresses()`
- Oracle `__init__(prediction_market_id, title, description, potential_outcomes, rules, data_source_domains, resolution_urls, earliest_resolution_date)`
- Oracle `resolve(evidence_url: str = "")`
- Oracle `get_dict()`
- Oracle `get_status()`

If any of these change, update all of:

- `src/app/api/bridge/deploy-intelligent-oracle/route.ts`
- `src/lib/genlayer-client.ts`
- `src/lib/genlayer-hooks.ts`
- `scripts/deploy.ts`
- Python tests under `test/`

## Contract Header

Production contracts use:

```python
# { "Depends": "py-genlayer:test" }
```

Direct-mode tests may rewrite that header through `test/tools/contracts.py`. Do not change test helper behavior unless the direct-mode runner requires it.

## Storage Rules

- Declare persistent fields as class-level annotations.
- Use GenLayer storage types such as `DynArray` and `TreeMap`.
- Do not persist raw Python `list` or `dict` fields.
- Store enum-like values as strings.
- Append to `DynArray` values instead of assigning Python arrays.
- Preserve storage order for already deployed contracts unless the user explicitly accepts a migration.

Example:

```python
class IntelligentOracle(gl.Contract):
    prediction_market_id: str
    potential_outcomes: DynArray[str]
    creator: Address

    def __init__(self, prediction_market_id: str, potential_outcomes: list[str]):
        self.prediction_market_id = prediction_market_id
        for outcome in potential_outcomes:
            self.potential_outcomes.append(outcome.strip())
        self.creator = gl.message.sender_address
```

## Oracle Validation Rules

Keep validation aligned with the TypeScript `OracleConfig` schema:

- Required `predictionMarketId`, `title`, `description`, `rules`, and `earliestResolutionDate`.
- At least two unique `potentialOutcomes`.
- Exactly one source mode: either `dataSourceDomains` or `resolutionURLs`.
- Evidence URLs must match configured domains when the oracle uses evidence mode.
- Resolution URLs mode must not accept a caller-provided evidence URL.

## Non-Determinism And Consensus

Use deterministic code outside nondeterministic blocks. For web and AI calls inside `resolve`, keep nondeterminism behind GenLayer APIs:

- `gl.nondet.web.get(...)`
- `gl.nondet.exec_prompt(...)`
- `gl.eq_principle.prompt_comparative(...)` or a custom validator if comparison needs stricter control

Do not move contract AI calls to the root Next API or AI SDK. The migration policy is:

- Non-contract assistant/chat AI uses AI SDK and OpenRouter.
- Contract resolution AI stays inside GenLayer contracts.

## LLM Output Handling

LLM responses must be parsed defensively. Keep JSON extraction narrow and tolerate wrappers, but fail safely:

```python
def _parse_json_dict(json_str: str) -> dict:
    if isinstance(json_str, dict):
        return json_str

    first_brace = json_str.find("{")
    last_brace = json_str.rfind("}")
    if first_brace == -1 or last_brace == -1:
        return {}
    json_str = json_str[first_brace : last_brace + 1]
    json_str = re.sub(r",(?!\s*?[\{\[\"\'\w])", "", json_str)
    return json.loads(json_str)
```

When changing prompts, keep outputs valid JSON and keep the `outcome` field constrained to one of the configured outcomes, `UNDETERMINED`, or `ERROR`.

## Error Behavior

Use `gl.vm.UserError` for expected contract-level reverts. Keep error messages stable when tests or UI may inspect them.

Important existing states:

- `Active`
- `Resolved`
- `Error`

## Test Expectations

Add or update direct-mode pytest coverage for:

- Constructor validation.
- Valid and invalid source modes.
- Resolution success with predefined `resolution_urls`.
- Resolution success with evidence URL mode.
- Bad evidence domain.
- Unexpected outcome and error status.
- Public `get_dict()` response shape.

Run root verification after contract changes when TypeScript integrations may be affected:

```bash
npm run check
```
