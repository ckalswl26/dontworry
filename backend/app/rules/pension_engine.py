"""국민연금 반환일시금 판정 Rule Engine.

중요: 국적만으로 대상에서 제외하지 않는다. 판정 우선순위는
1) 체류자격(비자) 기반 규칙 (E-9/H-2/E-8_LEGACY_TRAINING_EMPLOYMENT + NPS 가입)
2) 사회보장협정 체결국
3) 상응성 인정국
4) 위 어디에도 해당하지 않으면 ADDITIONAL_REVIEW로 처리한다.

E-8은 반드시 E-8_LEGACY_TRAINING_EMPLOYMENT / E-8_SEASONAL_WORK 로 구분해서
넘겨받아야 한다. 단순 "E-8" 문자열은 모호한 값으로 취급해 추가 확인을 요구한다.
"""
from __future__ import annotations

import json
from datetime import date
from functools import lru_cache

from app.config import DATA_DIR
from app.models.schemas import PensionRequest, PensionResult
from app.services import source_service

AMBIGUOUS_E8 = "E-8"


@lru_cache
def _load_rules() -> dict:
    path = DATA_DIR / "rules" / "pension_refund_rules.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _days_to_departure(departure_date: date | None) -> int | None:
    if departure_date is None:
        return None
    return (departure_date - date.today()).days


def evaluate(req: PensionRequest) -> PensionResult:
    rules = _load_rules()
    sources = source_service.get_sources([rules["source_id"]])

    if not req.nps_enrolled:
        return PensionResult(
            eligible=False,
            claimable_now=False,
            payable_now=False,
            reason_code="NOT_NPS_MEMBER",
            reason="국민연금에 가입한 이력이 없어 반환일시금 대상이 아닙니다.",
            next_action="국민연금 가입 이력이 있는지 국민연금공단(1355)에 확인해보세요.",
            matched_rule="NONE",
            sources=sources,
        )

    if req.visa_type == AMBIGUOUS_E8:
        return PensionResult(
            eligible=False,
            claimable_now=False,
            payable_now=False,
            reason_code="E8_SUBTYPE_UNSPECIFIED",
            reason="E-8 체류자격은 연수취업(과거)과 계절근로로 지급 대상 여부가 달라집니다. 정확한 구분이 필요합니다.",
            next_action="E-8 연수취업(과거)인지 계절근로인지 확인 후 다시 조회해주세요.",
            matched_rule="AMBIGUOUS",
            sources=sources,
        )

    visa_rule = rules["visa_based"]
    matched_rule = "UNKNOWN"
    eligible = False
    reason_code = "ADDITIONAL_REVIEW_REQUIRED"
    reason = "현재 규칙으로는 자동 판정이 어렵습니다. 국민연금공단에서 추가 확인이 필요합니다."

    if req.visa_type in visa_rule["eligible_visa_types"]:
        matched_rule = "VISA_BASED"
        eligible = True
        reason_code = "VISA_BASED_ELIGIBLE"
        reason = "체류자격(비자)과 국민연금 가입 이력을 기준으로 반환일시금 대상입니다. 국적과 무관하게 적용됩니다."
    elif req.visa_type in visa_rule["excluded_visa_types"]:
        matched_rule = "VISA_BASED_EXCLUDED"
        eligible = False
        reason_code = "E8_SEASONAL_NOT_ELIGIBLE"
        reason = "2019-12-24 이후 신설된 E-8 계절근로는 과거 E-8 연수취업과 달리 반환일시금 지급 대상이 아닙니다."
    else:
        agreement = rules["agreement_based"]
        reciprocity = rules["reciprocity_based"]
        nat = req.nationality.upper()
        months = req.nps_insured_months or 0

        if nat in agreement["countries"]:
            matched_rule = "AGREEMENT_BASED"
            eligible = True
            reason_code = "AGREEMENT_BASED_ELIGIBLE"
            reason = "대한민국과 사회보장협정을 체결한 국가의 국민으로 반환일시금 대상입니다."
        elif nat in reciprocity["no_minimum"]:
            matched_rule = "RECIPROCITY_BASED"
            eligible = True
            reason_code = "RECIPROCITY_BASED_ELIGIBLE"
            reason = "상응성이 인정되는 국가의 국민으로 최소 가입기간 조건 없이 반환일시금 대상입니다."
        elif nat in reciprocity["minimum_months_6"]:
            if months >= 6:
                matched_rule = "RECIPROCITY_BASED"
                eligible = True
                reason_code = "RECIPROCITY_BASED_ELIGIBLE"
                reason = "상응성 인정국(최소 가입기간 6개월) 조건을 충족해 반환일시금 대상입니다."
            else:
                matched_rule = "RECIPROCITY_BASED_INSUFFICIENT_MONTHS"
                reason_code = "RECIPROCITY_MIN_MONTHS_NOT_MET"
                reason = "상응성 인정국이지만 최소 가입기간(6개월)을 채우지 못했습니다."
        elif nat in reciprocity["minimum_months_12"]:
            if months >= 12:
                matched_rule = "RECIPROCITY_BASED"
                eligible = True
                reason_code = "RECIPROCITY_BASED_ELIGIBLE"
                reason = "상응성 인정국(최소 가입기간 12개월) 조건을 충족해 반환일시금 대상입니다."
            else:
                matched_rule = "RECIPROCITY_BASED_INSUFFICIENT_MONTHS"
                reason_code = "RECIPROCITY_MIN_MONTHS_NOT_MET"
                reason = "상응성 인정국이지만 최소 가입기간(12개월)을 채우지 못했습니다."

    days_left = _days_to_departure(req.departure_date)
    max_days_before = rules["claim_window"]["before_departure"]["max_days_before_departure"]

    claimable_now = eligible and (
        req.departure_confirmed or (days_left is not None and 0 <= days_left <= max_days_before)
    )
    payable_now = eligible and req.departure_confirmed

    missing_documents = list(rules["required_documents"])
    if req.departure_confirmed:
        missing_documents = [d for d in missing_documents if d != "flight_ticket_reservation_copy"]
    else:
        missing_documents = [d for d in missing_documents if d != "overseas_remittance_application"]

    if not eligible:
        next_action = "국민연금공단(1355) 또는 가까운 지사에서 반환일시금 대상 여부를 다시 확인해보세요."
    elif payable_now:
        next_action = "출국이 확인되었으므로 반환일시금을 바로 청구할 수 있습니다."
    elif claimable_now:
        next_action = "출국 30일 전이므로 항공권 예약 확인서와 함께 미리 청구서를 접수할 수 있습니다. 실제 지급은 출국 확인 후 이루어집니다."
    else:
        next_action = "출국일이 가까워지면(출국 30일 전부터) 반환일시금을 청구할 수 있습니다."

    return PensionResult(
        eligible=eligible,
        claimable_now=claimable_now,
        payable_now=payable_now,
        reason_code=reason_code,
        reason=reason,
        missing_documents=missing_documents,
        next_action=next_action,
        matched_rule=matched_rule,
        sources=sources,
    )
