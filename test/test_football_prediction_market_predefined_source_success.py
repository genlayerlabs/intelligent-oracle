from tools.contracts import deploy_oracle_direct, mock_oracle_resolution


def test_football_prediction_market_predefined_source_success(
    direct_vm, direct_deploy, direct_alice, tmp_path
):
    data_source = "https://www.bbc.com/sport/football/scores-fixtures/2024-10-09"
    contract = deploy_oracle_direct(
        direct_vm,
        direct_deploy,
        direct_alice,
        tmp_path,
        resolution_urls=[data_source],
    )

    contract_state = contract.get_dict()
    assert contract_state["status"] == "Active"
    assert contract_state["resolution_urls"] == [data_source]

    mock_oracle_resolution(
        direct_vm,
        outcome="Bayern Munich",
        web_body=b"Bayern Munich defeated Arsenal.",
    )
    contract.resolve()

    contract_state = contract.get_dict()
    assert contract_state["status"] == "Resolved"
    assert contract_state["outcome"] == "Bayern Munich"
