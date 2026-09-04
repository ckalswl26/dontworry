from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_demo_persona():
    resp = client.get("/api/demo/persona")
    assert resp.status_code == 200
    body = resp.json()
    assert body["profile"]["nationality"] == "VN"
    assert body["profile"]["visa_type"] == "E-9"


def test_rules_evaluate_vietnam_e9():
    resp = client.post(
        "/api/rules/evaluate",
        json={
            "profile": {
                "nationality": "VN",
                "visa_type": "E-9",
                "departure_date": "2026-10-14",
                "nps_enrolled": True,
                "nps_insured_months": 36,
                "tenure_months": 36,
                "language": "vi",
            },
            "documents_held": [],
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["pension"]["eligible"] is True
    assert "베트남" not in body["pension"]["reason"]
    task_ids = {t["task_id"] for t in body["tasks"]}
    assert "pension_refund" in task_ids


def test_departure_plan_orders_notification_before_confirmation():
    resp = client.post("/api/departure/plan", json={"profile": {"nationality": "VN", "visa_type": "E-9"}})
    assert resp.status_code == 200
    steps = resp.json()["ordered_steps"]
    order = {s["task_id"]: s["step"] for s in steps}
    assert order["departure_notification"] < order["departure_confirmation"]


def test_planner_calculate():
    resp = client.post(
        "/api/planner/calculate",
        json={
            "target_amount": 20000000,
            "current_savings": 0,
            "months_left": 40,
            "monthly_income": 2200000,
            "expenses": {"communication": 150000, "remittance": 800000},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["required_monthly_saving"] == 500000
    assert body["goal_met"] is True


def test_briefing_returns_top3():
    resp = client.post(
        "/api/briefing",
        json={
            "profile": {
                "nationality": "VN",
                "visa_type": "E-9",
                "departure_date": "2026-10-14",
                "nps_enrolled": True,
                "tenure_months": 36,
            },
            "documents_held": [],
            "planner": {
                "target_amount": 20000000,
                "current_savings": 0,
                "months_left": 40,
                "monthly_income": 2200000,
                "expenses": {"communication": 150000, "remittance": 1900000},
            },
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["top3_summary"]) > 0


def test_finance_whitelist_excludes_ended():
    resp = client.get("/api/finance/whitelist")
    assert resp.status_code == 200
    ids = [p["product_id"] for p in resp.json()["products"]]
    assert "KINFA_EMPLOYEE_HESSAL_LEGACY" not in ids


def test_cors_allows_any_vercel_preview_deployment_url():
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "https://frontend-dslg91wot-charmingzi1.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code == 200
    assert resp.headers["access-control-allow-origin"] == "https://frontend-dslg91wot-charmingzi1.vercel.app"


def test_cors_rejects_unrelated_origin():
    resp = client.options(
        "/api/health",
        headers={"Origin": "https://evil-example.com", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in resp.headers


def test_products_recommend_returns_only_eligible_candidates():
    resp = client.post(
        "/api/products/recommend",
        json={
            "nationality": "VN",
            "visa_type": "E-9",
            "has_arc": True,
            "is_tax_resident": False,
            "tenure_months": 8,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    ids = [r["product_id"] for r in body["recommendations"]]
    assert "NH_K_FOREIGNER_CREDIT_LOAN" in ids
    assert "ISA_GENERAL" not in ids  # 세법상 거주자 아님
    assert "KINFA_EMPLOYEE_HESSAL_LEGACY" not in ids  # ENDED
