from tools.contracts import deploy_oracle_direct, mock_oracle_resolution


def test_football_prediction_market_predefined_source_error_unexpected_outcome(
    direct_vm, direct_deploy, direct_alice, tmp_path
):
    data_source = "https://www.bbc.com/sport/football/scores-fixtures/2024-10-10"
    contract = deploy_oracle_direct(
        direct_vm,
        direct_deploy,
        direct_alice,
        tmp_path,
        prediction_market_id="unexpected_outcome_test",
        potential_outcomes=["Italy", "Belgium"],
        resolution_urls=[data_source],
    )

    mock_oracle_resolution(direct_vm, outcome="Draw", web_body=b"The match ended draw.")
    contract.resolve()

    contract_state = contract.get_dict()
    assert contract_state["status"] == "Error"
    assert contract_state["outcome"] == ""
