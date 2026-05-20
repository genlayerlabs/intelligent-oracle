from tools.contracts import deploy_oracle_direct, mock_oracle_resolution


def test_football_prediction_market_predefined_source_fail_bad_source(
    direct_vm, direct_deploy, direct_alice, tmp_path
):
    data_source = "https://www.bbc.com/sport/football/scores-fixtures/2024-10-10"
    contract = deploy_oracle_direct(
        direct_vm,
        direct_deploy,
        direct_alice,
        tmp_path,
        resolution_urls=[data_source],
    )

    contract_state = contract.get_dict()
    assert contract_state["status"] == "Active"
    assert contract_state["outcome"] == ""

    mock_oracle_resolution(
        direct_vm,
        outcome="UNDETERMINED",
        event_has_occurred="false",
        web_body=b"No final score is available.",
    )
    contract.resolve()

    contract_state = contract.get_dict()
    assert contract_state["status"] == "Active"
    assert contract_state["outcome"] == ""
