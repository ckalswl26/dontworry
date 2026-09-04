"""LLM 연동 계층.

역할 경계 (반드시 지킬 것):
- LLM은 자연어 이해(F1)와 제한된 Action Ranking(F10)만 담당한다.
- 자격판정/기간/서류/금융계산/신호등은 전부 Rule Engine과 Calculator가 코드로 계산하고,
  이 모듈은 그 결과를 사용자 언어로 요약하는 역할만 한다.
- ANTHROPIC_API_KEY가 없거나 호출이 실패하면 결정론적 fallback으로 조용히 대체한다
  (앱이 죽지 않아야 하고, 키 관련 오류를 사용자에게 노출하지 않는다).
"""
from __future__ import annotations

import json
import logging

from app.config import get_settings
from app.models.schemas import ActionItem, IntentResult, UserProfile

logger = logging.getLogger(__name__)

KNOWN_TASK_TYPES = [
    "departure_notification",
    "departure_confirmation",
    "return_cost_insurance",
    "maturity_insurance",
    "overseas_remittance",
    "account_closure",
    "pension_refund",
]

EXTRACT_INTENT_TOOL = {
    "name": "extract_user_situation",
    "description": "사용자의 자연어 질문에서 출국/금융 관련 상황을 구조화한다.",
    "input_schema": {
        "type": "object",
        "properties": {
            "intent_candidates": {
                "type": "array",
                "items": {"type": "string", "enum": KNOWN_TASK_TYPES},
                "description": "질문과 관련이 있을 가능성이 있는 업무 목록만 선택. 존재하지 않는 업무를 지어내지 말 것.",
            },
            "documents_held": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        },
        "required": ["intent_candidates", "confidence"],
    },
}


def _get_client():
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    try:
        import anthropic

        return anthropic.Anthropic(api_key=settings.anthropic_api_key)
    except Exception:  # pragma: no cover - defensive
        logger.exception("Failed to init Anthropic client")
        return None


def _fallback_intent(text: str, profile: UserProfile) -> IntentResult:
    text_lower = text.lower()
    candidates: list[str] = []
    keyword_map = {
        "departure_notification": ["출국", "신고", "xuất cảnh", "leave", "depart"],
        "return_cost_insurance": ["귀국", "보험", "bảo hiểm", "insurance"],
        "maturity_insurance": ["만기", "보험금", "maturity"],
        "pension_refund": ["연금", "일시금", "pension", "lương hưu"],
        "overseas_remittance": ["송금", "remittance", "chuyển tiền", "돈"],
        "account_closure": ["통장", "계좌", "account", "tài khoản"],
    }
    for task_type, keywords in keyword_map.items():
        if any(k in text_lower for k in keywords):
            candidates.append(task_type)
    if not candidates:
        candidates = KNOWN_TASK_TYPES.copy()

    return IntentResult(
        nationality=profile.nationality,
        visa_type=profile.visa_type,
        intent_candidates=candidates,
        confidence=0.35,
    )


def extract_intent(text: str, profile: UserProfile) -> IntentResult:
    client = _get_client()
    if client is None:
        return _fallback_intent(text, profile)

    try:
        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=512,
            tools=[EXTRACT_INTENT_TOOL],
            tool_choice={"type": "tool", "name": "extract_user_situation"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"사용자 체류자격: {profile.visa_type}, 국적: {profile.nationality}\n"
                        f"질문: {text}"
                    ),
                }
            ],
        )
        tool_use = next(b for b in response.content if b.type == "tool_use")
        payload = tool_use.input
        candidates = [c for c in payload.get("intent_candidates", []) if c in KNOWN_TASK_TYPES]
        if not candidates:
            candidates = KNOWN_TASK_TYPES.copy()
        return IntentResult(
            nationality=profile.nationality,
            visa_type=profile.visa_type,
            intent_candidates=candidates,
            documents_held=payload.get("documents_held", []),
            confidence=float(payload.get("confidence", 0.5)),
        )
    except Exception:
        logger.exception("Anthropic intent extraction failed, using fallback")
        return _fallback_intent(text, profile)


RANK_ACTIONS_TOOL = {
    "name": "rank_actions",
    "description": "제시된 후보 action_id 중에서만 최대 3개를 골라 우선순위를 매긴다.",
    "input_schema": {
        "type": "object",
        "properties": {
            "ranked_action_ids": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
            "reasoning_per_action": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"action_id": {"type": "string"}, "why": {"type": "string"}},
                    "required": ["action_id", "why"],
                },
            },
        },
        "required": ["ranked_action_ids", "reasoning_per_action"],
    },
}

# GUARD: Rule 기반 fallback 우선순위 (제출액 부족 > 방문 임박 > 서류 미비 순)
_FALLBACK_PRIORITY = [
    "ACT-DEADLINE-PRIORITIZE",
    "ACT-DEPARTURE-REPORT",
    "ACT-REMIT-ADJUST",
    "ACT-EXPENSE-CUT",
    "ACT-SAVINGS-GOAL-ADJUST",
    "ACT-SUNDAY-BOOK",
    "ACT-DOC-PREP",
    "ACT-WAGE-VERIFY",
    "ACT-NOT-APPLICABLE-INFO",
]


def _fallback_ranking(candidates: list[dict], crisis_signals: dict) -> list[ActionItem]:
    candidate_ids = [c["action_id"] for c in candidates]
    catalog_by_id = {c["action_id"]: c for c in candidates}
    ordered = [a for a in _FALLBACK_PRIORITY if a in candidate_ids][:3]
    reasons = {
        "ACT-REMIT-ADJUST": f"이번 달 저축 부족액이 {crisis_signals.get('shortfall_amount', 0):,}원입니다.",
        "ACT-EXPENSE-CUT": "통계 평균 대비 과다 지출 항목이 있는지 확인이 필요합니다.",
        "ACT-SAVINGS-GOAL-ADJUST": "현재 조건으로는 목표 달성이 어려워 목표 재조정이 필요합니다.",
        "ACT-DOC-PREP": f"서류 준비도가 {crisis_signals.get('document_readiness_pct', 0)}%입니다.",
        "ACT-SUNDAY-BOOK": "방문이 필요한 업무가 있습니다.",
        "ACT-DEPARTURE-REPORT": "아직 처리되지 않은 선행 절차가 있습니다.",
        "ACT-DEADLINE-PRIORITIZE": f"출국까지 {crisis_signals.get('days_to_deadline', '?')}일 남았습니다.",
        "ACT-WAGE-VERIFY": "최저임금 기준 이상인지 확인이 필요합니다.",
        "ACT-NOT-APPLICABLE-INFO": "해당없음으로 표시된 업무가 있어 헛걸음을 방지하기 위해 안내합니다.",
    }
    return [
        ActionItem(
            action_id=aid,
            title=catalog_by_id[aid]["title_ko"],
            why=reasons.get(aid, ""),
            category=catalog_by_id[aid].get("category", "FALLBACK"),
        )
        for aid in ordered
    ]


def rank_actions(crisis_signals: dict, candidates: list[dict]) -> tuple[list[ActionItem], bool]:
    """Returns (ranked actions, ai_generated flag)."""
    candidate_ids = [c["action_id"] for c in candidates]
    if not candidate_ids:
        return [], False

    client = _get_client()
    if client is None:
        return _fallback_ranking(candidates, crisis_signals), False

    try:
        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1024,
            tools=[RANK_ACTIONS_TOOL],
            tool_choice={"type": "tool", "name": "rank_actions"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        "다음은 규칙 엔진이 계산한 위기 신호(crisis signals)와 정해진 조치 후보 목록입니다. "
                        "이 목록 안에 있는 action_id만 사용해서 최대 3개를 우선순위대로 고르고, "
                        "각 조치가 왜 필요한지 사용자의 실제 숫자를 인용해 한국어로 설명하세요. "
                        "목록에 없는 새 조치를 만들지 마세요.\n\n"
                        f"crisis_signals: {json.dumps(crisis_signals, ensure_ascii=False)}\n"
                        f"candidate_actions: {json.dumps(candidates, ensure_ascii=False)}"
                    ),
                }
            ],
        )
        tool_use = next(b for b in response.content if b.type == "tool_use")
        payload = tool_use.input
        ranked_ids = payload.get("ranked_action_ids", [])

        # GUARD: catalog 밖 action_id가 하나라도 있으면 전부 거부하고 fallback 사용
        if not ranked_ids or any(rid not in candidate_ids for rid in ranked_ids):
            logger.warning("AI returned out-of-catalog action ids, falling back to rule-based ranking")
            return _fallback_ranking(candidates, crisis_signals), False

        reasoning_map = {r["action_id"]: r["why"] for r in payload.get("reasoning_per_action", [])}
        catalog_by_id = {c["action_id"]: c for c in candidates}
        actions = [
            ActionItem(
                action_id=aid,
                title=catalog_by_id[aid]["title_ko"],
                why=reasoning_map.get(aid, ""),
                category=catalog_by_id[aid].get("category", ""),
            )
            for aid in ranked_ids[:3]
        ]
        return actions, True
    except Exception:
        logger.exception("Anthropic action ranking failed, using fallback")
        return _fallback_ranking(candidates, crisis_signals), False
