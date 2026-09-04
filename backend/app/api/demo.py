from datetime import date, timedelta

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["demo"])

DEMO_NAME = "응우옌 민"


@router.get("/demo/persona")
def demo_persona():
    departure = date.today() + timedelta(days=40)
    return {
        "name": DEMO_NAME,
        "profile": {
            "nationality": "VN",
            "visa_type": "E-9",
            "visa_expiry_date": (departure + timedelta(days=4)).isoformat(),
            "departure_date": departure.isoformat(),
            "available_visit_time": ["sunday_only"],
            "nps_enrolled": True,
            "nps_insured_months": 36,
            "tenure_months": 36,
            "language": "vi",
        },
        "planner": {
            "target_amount": 20_000_000,
            "current_savings": 0,
            "months_left": 40,
            "monthly_income": 2_200_000,
            "expenses": {
                "housing": 0,
                "food": 0,
                "communication": 150_000,
                "transportation": 0,
                "remittance": 800_000,
                "other": 0,
            },
            "meals_housing_provided": True,
        },
        "documents_held": ["passport_or_foreigner_registration_card_copy", "personal_bankbook_copy"],
    }
