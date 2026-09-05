from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class SignalStatus(str, Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"
    NA = "N/A"


class RuleStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    CONDITIONAL = "CONDITIONAL"
    ADDITIONAL_REVIEW = "ADDITIONAL_REVIEW"
    EXTERNAL_RULESET_REQUIRED = "EXTERNAL_RULESET_REQUIRED"
    NOT_SUPPORTED = "NOT_SUPPORTED"


# ---------- User / Onboarding ----------

class UserProfile(BaseModel):
    nationality: str = Field(..., description="ISO 3166-1 alpha-2, e.g. VN")
    visa_type: str = Field(..., description="법무부 체류자격 코드, e.g. E-9")
    visa_expiry_date: date | None = None
    departure_date: date | None = None
    available_visit_time: list[str] = Field(default_factory=list)
    nps_enrolled: bool | None = None
    nps_insured_months: int | None = None
    tenure_months: int | None = None
    industry: str | None = None
    language: Literal["ko", "en", "vi"] = "ko"


# ---------- F1 Intent ----------

class IntentRequest(BaseModel):
    text: str
    profile: UserProfile
    last_confirmed_intent: str | None = None
    conversation_context: dict[str, Any] = Field(default_factory=dict)


class IntentResult(BaseModel):
    nationality: str
    visa_type: str
    residency_days_left: int | None = None
    intent_candidates: list[str]
    documents_held: list[str] = Field(default_factory=list)
    available_time_slots: list[str] = Field(default_factory=list)
    confidence: float = 0.5
    context_used: bool = False
    out_of_scope: bool = False


# ---------- F2/F3 Rule evaluation ----------

class SourceRef(BaseModel):
    source_id: str
    organization: str | None = None
    title: str | None = None
    source_url: str | None = None
    authority_grade: str | None = None
    status: str | None = None
    last_verified_at: str | None = None


class AlternativeChannel(BaseModel):
    """방문 없이 처리할 수 있는 실제 확인된 대안 채널만 담는다.
    확인 안 된 URL·전화번호는 절대 넣지 않고 null로 둔다."""
    name: str
    description: str | None = None
    url: str | None = None
    phone: str | None = None
    source_id: str | None = None


class TaskSignal(BaseModel):
    task_id: str
    label: str
    signal: SignalStatus
    reason: str
    required_documents: list[str] = Field(default_factory=list)
    channel: str | None = None
    responsible_org: str | None = None
    actor: str = "WORKER"
    sources: list[SourceRef] = Field(default_factory=list)
    alternative_channel: AlternativeChannel | None = None


class RuleEvaluateRequest(BaseModel):
    profile: UserProfile
    documents_held: list[str] = Field(default_factory=list)


class RuleEvaluateResponse(BaseModel):
    days_to_departure: int | None
    tasks: list[TaskSignal]
    pension: "PensionResult"


# ---------- Workflow ----------

class WorkflowStep(BaseModel):
    step: int
    task_id: str
    label: str
    priority: Literal["REQUIRED", "RECOMMENDED", "INFO"]
    edge_type: str | None = None
    note: str | None = None


class DeparturePlanRequest(BaseModel):
    profile: UserProfile


class DeparturePlanResponse(BaseModel):
    ordered_steps: list[WorkflowStep]
    product_categories: list[str] = Field(default_factory=list)


# ---------- F4 Documents ----------

class DocumentReadinessRequest(BaseModel):
    task_id: str
    required_documents: list[str]
    documents_held: list[str]


class DocumentReadinessResponse(BaseModel):
    task_id: str
    total: int
    held: int
    missing: list[str]
    readiness_pct: float


# ---------- Pension ----------

class PensionRequest(BaseModel):
    nationality: str
    visa_type: str
    nps_enrolled: bool
    nps_insured_months: int | None = None
    departure_date: date | None = None
    departure_confirmed: bool = False


class PensionResult(BaseModel):
    eligible: bool
    claimable_now: bool
    payable_now: bool
    reason_code: str
    reason: str
    missing_documents: list[str] = Field(default_factory=list)
    next_action: str
    matched_rule: str
    sources: list[SourceRef] = Field(default_factory=list)


# ---------- Finance ----------

class AmountRange(BaseModel):
    min: int | None = None
    max: int | None = None


class TermMonthsRange(BaseModel):
    min: int | None = None
    max: int | None = None


class ProductEligibility(BaseModel):
    """RULE 단계에서만 사용하는 결정론적 자격 조건. LLM은 이 값을 만들거나 바꾸지 않는다."""
    visa_types: list[str] = Field(default_factory=list, description="비어 있으면 비자 종류 무관(전체 허용)")
    requires_arc: bool = False
    min_tenure_months: int = 0
    is_tax_resident_required: bool = False
    min_visa_remaining_months: int | None = None


class FinanceProduct(BaseModel):
    product_id: str
    product_name: str
    bank: str
    product_type: str
    product_category: str | None = None
    base_rate: float | None = None
    max_rate: float | None = None
    rate_as_of: str | None = None
    contract_months: int | None = None
    monthly_min_amount: int | None = None
    monthly_max_amount: int | None = None
    status: str = "ACTIVE"
    disclaimer: str = "현재 입력한 조건 기준으로 확인해볼 수 있는 상품 카테고리입니다. 최종 가입 여부는 금융회사 확인이 필요합니다."
    sources: list[SourceRef] = Field(default_factory=list)
    eligibility: ProductEligibility | None = None
    amount_range: AmountRange | None = None
    term_months_range: TermMonthsRange | None = None
    purpose_tags: list[str] = Field(default_factory=list)
    notes_ko: str = ""
    caution_ko: str | None = Field(None, description="가입 가능하지만 실질 혜택이 제한적인 경우의 주의 문구(예: 청약 당첨 기회 제한)")
    source_url: str | None = None


class UserFinanceProfile(BaseModel):
    nationality: str
    visa_type: str
    has_arc: bool | None = None
    is_tax_resident: bool | None = None
    tenure_months: int | None = None
    visa_remaining_months: int | None = None
    purpose: str | None = Field(None, description="선택: 저축/청약/송금/대출/보장/외화예금 등 목적 태그")


class ProductRecommendation(BaseModel):
    product_id: str
    institution: str
    product_name: str
    category: str
    reason_ko: str
    eligibility_badge_ko: str
    caution_ko: str | None = None
    source_url: str | None = None


class ProductRecommendationResponse(BaseModel):
    recommendations: list[ProductRecommendation]
    ai_generated: bool = False


# ---------- F6 Planner ----------

class ExpenseBreakdown(BaseModel):
    housing: int = 0
    food: int = 0
    communication: int = 0
    transportation: int = 0
    remittance: int = 0
    other: int = 0

    @field_validator("housing", "food", "communication", "transportation", "remittance", "other", mode="before")
    @classmethod
    def parse_krw(cls, value: Any) -> Any:
        return value.replace(",", "").replace("₩", "").strip() if isinstance(value, str) else value

    @property
    def total(self) -> int:
        return self.housing + self.food + self.communication + self.transportation + self.remittance + self.other


class PlannerRequest(BaseModel):
    target_amount: int
    current_savings: int = 0
    months_left: int
    monthly_income: int
    expenses: ExpenseBreakdown
    meals_housing_provided: bool = False

    @field_validator("target_amount", "current_savings", "monthly_income", mode="before")
    @classmethod
    def parse_krw(cls, value: Any) -> Any:
        return value.replace(",", "").replace("₩", "").strip() if isinstance(value, str) else value


class PlannerResponse(BaseModel):
    disposable_income: int
    required_monthly_saving: float
    goal_met: bool
    shortfall_amount: int
    recommended_categories: list[str] = Field(default_factory=list)


# ---------- F7 D-Day ----------

class DDayItem(BaseModel):
    day_offset: int
    label: str
    task_id: str | None
    is_recommended_not_legal: bool = True
    detail: str
    requires_visit: bool = False


class DDayResponse(BaseModel):
    departure_date: date
    days_left: int
    items: list[DDayItem]


# ---------- F10 Briefing ----------

class BriefingRequest(BaseModel):
    profile: UserProfile
    documents_held: list[str] = Field(default_factory=list)
    planner: PlannerRequest | None = None
    hourly_wage: float | None = None
    weekly_work_hours: float | None = None
    overtime_hours: float | None = None


class ActionItem(BaseModel):
    action_id: str
    title: str
    why: str
    category: str


class BriefingResponse(BaseModel):
    crisis_signals: dict[str, Any]
    ranked_actions: list[ActionItem]
    top3_summary: list[str]
    sources: list[SourceRef] = Field(default_factory=list)
    ai_generated: bool = False


class ScenarioRequest(BaseModel):
    base_planner: PlannerRequest
    changed_field: Literal["housing", "food", "communication", "transportation", "remittance", "other", "monthly_income", "months_left"]
    new_value: int


class ScenarioResponse(BaseModel):
    base: PlannerResponse
    updated: PlannerResponse
    delta_required_monthly_saving: float


# ---------- 실시간 환율 계산기 ----------

class FxRate(BaseModel):
    currency: str
    rate: float
    as_of: str


class FxRatesResponse(BaseModel):
    """환율 숫자는 항상 ECOS 실제 응답값만 담는다 - 추정치를 채우지 않는다."""
    base: str = "KRW"
    rates: list[FxRate] = Field(default_factory=list)
    unsupported: list[str] = Field(default_factory=list)
    sources: list[SourceRef] = Field(default_factory=list)
    available: bool = True
    error: str | None = None


class FxHistoryPoint(BaseModel):
    date: str
    rate: float


class FxHistoryResponse(BaseModel):
    currency: str
    base: str = "KRW"
    points: list[FxHistoryPoint] = Field(default_factory=list)
    sources: list[SourceRef] = Field(default_factory=list)
    available: bool = True
    error: str | None = None


# ---------- 은행 지점 검색 / GPS 근처 지점 찾기 ----------

class BranchLocation(BaseModel):
    """카카오 로컬 API가 실시간으로 반환한 실제 지점 정보만 담는다 - 좌표/주소를 추측하지 않는다."""
    place_name: str
    bank: str | None = None
    address: str | None = None
    road_address: str | None = None
    phone: str | None = None
    lat: float
    lng: float
    distance_m: int | None = None
    place_url: str | None = None
    sunday_branch: bool = False
    sunday_branch_note: str | None = None
    sunday_branch_source_id: str | None = None


class BranchSearchResponse(BaseModel):
    branches: list[BranchLocation] = Field(default_factory=list)
    available: bool = True
    error: str | None = None
    attribution: str = "이 서비스는 카카오맵의 API를 이용하고 있습니다."


# ---------- 다국어 상담 지점 찾기 (F 신규 3순위) ----------

class MultilingualBranch(BaseModel):
    """검증된 정보만 담는다 - 주소·전화번호를 추측해서 채우지 않는다."""
    branch_id: str
    bank: str
    branch_name: str
    address: str | None = None
    phone: str | None = None
    languages: list[str] = Field(default_factory=list)
    note: str | None = None
    verified: bool = True
    authority_grade: str
    source_id: str
    last_verified_at: str


RuleEvaluateResponse.model_rebuild()
