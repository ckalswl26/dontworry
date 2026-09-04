from app.rules import engine as rule_engine


def test_no_task_currently_has_a_fabricated_alternative_channel():
    """현재 seed 데이터에는 검증된 비대면 대안 채널이 없는 업무만 있다.
    확인 안 된 URL/전화번호를 지어내지 않는다는 원칙을 지키기 위해,
    alternative_channel이 있는 노드는 반드시 source_id를 가져야 한다."""
    for node in rule_engine.get_all_nodes():
        alt = node.get("alternative_channel")
        if alt is not None:
            assert alt.get("source_id"), f"{node['id']}: alternative_channel must cite a source_id"


def test_evaluate_tasks_parses_alternative_channel_when_present(monkeypatch):
    fake_nodes = [
        {
            "id": "test_task",
            "label_ko": "테스트 업무",
            "category": "FINANCE",
            "task_type": "test_task",
            "signal_rule": {"default": {"signal": "AMBER", "reason_ko": "테스트"}},
            "required_documents": [],
            "channel": "BRANCH_VISIT",
            "responsible_org": "테스트 기관",
            "source_refs": [],
            "alternative_channel": {
                "name": "테스트 앱",
                "description": "앱으로 처리 가능",
                "url": "https://example.com",
                "phone": None,
                "source_id": "TEST_SOURCE",
            },
        }
    ]
    monkeypatch.setattr(rule_engine, "_load_graph", lambda: {"nodes": fake_nodes, "edges": []})

    ctx = rule_engine.RuleContext(nationality="VN", visa_type="E-9")
    tasks = rule_engine.evaluate_tasks(ctx)

    assert tasks[0].alternative_channel is not None
    assert tasks[0].alternative_channel.name == "테스트 앱"
    assert tasks[0].alternative_channel.url == "https://example.com"


def test_evaluate_tasks_leaves_alternative_channel_none_when_absent():
    ctx = rule_engine.RuleContext(nationality="VN", visa_type="E-9")
    tasks = rule_engine.evaluate_tasks(ctx)
    account_closure = next(t for t in tasks if t.task_id == "account_closure")
    assert account_closure.alternative_channel is None
