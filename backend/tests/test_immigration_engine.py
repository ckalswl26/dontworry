from app.rules import immigration_engine


def test_workplace_change_within_limit_confirmed():
    result = immigration_engine.evaluate_workplace_change(changes_used=1, is_reemployment_period=False)
    assert result["status"] == "CONFIRMED"
    assert result["deadline_months"]["employment_center_application"] == 1
    assert result["deadline_months"]["immigration_permission"] == 3


def test_workplace_change_at_limit_conditional():
    result = immigration_engine.evaluate_workplace_change(changes_used=3, is_reemployment_period=False)
    assert result["status"] == "CONDITIONAL"


def test_workplace_change_reemployment_period_lower_limit():
    result = immigration_engine.evaluate_workplace_change(changes_used=2, is_reemployment_period=True)
    assert result["status"] == "CONDITIONAL"


def test_workplace_change_not_at_fault_does_not_count():
    at_fault = immigration_engine.evaluate_workplace_change(changes_used=3, worker_at_fault=True)
    not_at_fault = immigration_engine.evaluate_workplace_change(changes_used=3, worker_at_fault=False)
    assert at_fault["status"] == "CONDITIONAL"
    assert not_at_fault["status"] == "CONFIRMED"


def test_e9_to_e7_4_is_external_ruleset_required_not_confirmed():
    transition = immigration_engine.get_status_transition("E-9", "E-7-4")
    assert transition["status"] == "EXTERNAL_RULESET_REQUIRED"


def test_e9_to_d2_requires_exit_and_reenter():
    transition = immigration_engine.get_status_transition("E-9", "D-2")
    assert transition["change_to_D2_after_current_stay_domestic"] is False
    assert transition["required_route"] == "EXIT_AND_REENTER_WITH_D2_VISA"
