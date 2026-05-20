import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACTS_DIR = REPO_ROOT / "intelligent-contracts"
ORACLE_CONTRACT_PATH = str(CONTRACTS_DIR / "IntelligentOracle.py")
DIRECT_DEPENDS_HEADER = '# { "Depends": "py-genlayer-multi:test" }'


def read_contract_source(filename: str) -> str:
    return (CONTRACTS_DIR / filename).read_text(encoding="utf-8")


def encode_contract_source(contract_source: str) -> str:
    return "0x" + contract_source.encode("utf-8").hex()


def deploy_oracle_direct(
    direct_vm,
    direct_deploy,
    sender,
    tmp_path,
    *,
    prediction_market_id: str = "1",
    title: str = "Football Prediction Market",
    description: str = "Predict the outcome of a football match",
    potential_outcomes: list[str] | None = None,
    rules: list[str] | None = None,
    data_source_domains: list[str] | None = None,
    resolution_urls: list[str] | None = None,
    earliest_resolution_date: str = "2024-01-01T00:00:00+00:00",
):
    contract_source = read_contract_source("IntelligentOracle.py")
    direct_contract_path = tmp_path / "IntelligentOracle.direct.py"
    direct_contract_path.write_text(
        DIRECT_DEPENDS_HEADER + "\n" + "\n".join(contract_source.splitlines()[1:]),
        encoding="utf-8",
    )
    direct_vm.sender = sender
    return direct_deploy(
        str(direct_contract_path),
        prediction_market_id,
        title,
        description,
        potential_outcomes or ["Bayern Munich", "Arsenal", "Draw"],
        rules or ["The outcome is the result of the match"],
        data_source_domains or [],
        resolution_urls or [],
        earliest_resolution_date,
    )


def mock_oracle_resolution(
    direct_vm,
    *,
    outcome: str,
    web_body: bytes = b"",
    valid_source: str = "true",
    event_has_occurred: str = "true",
):
    direct_vm.mock_web(r".*", {"status": 200, "body": web_body})
    direct_vm.mock_llm(
        r".*",
        json.dumps(
            {
                "valid_source": valid_source,
                "event_has_occurred": event_has_occurred,
                "reasoning": "mocked direct-mode resolution",
                "outcome": outcome,
            }
        ),
    )
