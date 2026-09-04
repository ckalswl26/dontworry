from app.rules import engine as rule_engine


def test_departure_notification_is_prerequisite_for_confirmation():
    steps = rule_engine.build_workflow()
    order = {s.task_id: s.step for s in steps}
    assert order["departure_notification"] < order["departure_confirmation"]
    assert order["departure_confirmation"] < order["return_cost_insurance"]
    assert order["departure_confirmation"] < order["maturity_insurance"]


def test_required_before_edges_marked_required_priority():
    steps = rule_engine.build_workflow()
    confirmation_step = next(s for s in steps if s.task_id == "departure_confirmation")
    assert confirmation_step.priority == "REQUIRED"


def test_return_cost_insurance_required_documents():
    node = rule_engine.get_node("return_cost_insurance")
    docs = set(node["required_documents"])
    assert docs == {
        "insurance_claim_form",
        "personal_bankbook_copy",
        "passport_or_foreigner_registration_card_copy",
        "departure_expected_confirmation",
    }


def test_signal_red_when_close_to_departure():
    ctx = rule_engine.RuleContext(nationality="VN", visa_type="E-9", days_to_departure=5)
    tasks = rule_engine.evaluate_tasks(ctx)
    departure_task = next(t for t in tasks if t.task_id == "departure_notification")
    assert departure_task.signal.value == "RED"


def test_signal_na_maturity_insurance_under_12_months_tenure():
    ctx = rule_engine.RuleContext(nationality="VN", visa_type="E-9", days_to_departure=40, tenure_months=6)
    tasks = rule_engine.evaluate_tasks(ctx)
    maturity_task = next(t for t in tasks if t.task_id == "maturity_insurance")
    assert maturity_task.signal.value == "N/A"
