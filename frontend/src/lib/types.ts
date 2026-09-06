export type Lang = "ko" | "en" | "vi" | "km" | "id" | "lo" | "my" | "bn" | "ne" | "ur" | "si" | "ky" | "tg" | "uz" | "zh" | "mn";

// 자동번역(기계번역)으로 채워진 언어 - 사람이 검증하지 않았으므로 화면에 경고 배지를 띄운다.
export const AUTO_TRANSLATED_LANGS: Lang[] = ["km", "id", "lo", "my", "bn", "ne", "ur", "si", "ky", "tg", "uz", "zh", "mn"];

// 국적명/통화명 등 ko/en/vi로만 채워진 보조 데이터를 나머지 13개 언어로 볼 때
// 안전하게 한국어로 대체한다 (본문 UI 텍스트는 dictionaries에 16개 언어 모두 있음).
export function pickLang3<T extends { ko: string; en: string; vi: string }>(obj: T, lang: Lang): string {
  return (obj as unknown as Record<string, string>)[lang] ?? obj.ko;
}

export interface UserProfile {
  /** 서버에 저장되지 않는 프론트엔드 전용 필드. 화면 인사말 등 표시용으로만 쓴다. */
  name?: string;
  nationality: string;
  visa_type: string;
  visa_expiry_date?: string | null;
  departure_date?: string | null;
  available_visit_time: string[];
  nps_enrolled?: boolean | null;
  nps_insured_months?: number | null;
  tenure_months?: number | null;
  industry?: string | null;
  language: Lang;
}

export interface SourceRef {
  source_id: string;
  organization?: string | null;
  title?: string | null;
  source_url?: string | null;
  authority_grade?: string | null;
  status?: string | null;
  last_verified_at?: string | null;
}

export type SignalStatus = "GREEN" | "AMBER" | "RED" | "N/A";

export interface AlternativeChannel {
  name: string;
  description?: string | null;
  url?: string | null;
  phone?: string | null;
  source_id?: string | null;
}

export interface TaskSignal {
  task_id: string;
  label: string;
  signal: SignalStatus;
  reason: string;
  required_documents: string[];
  channel?: string | null;
  responsible_org?: string | null;
  actor: string;
  sources: SourceRef[];
  alternative_channel?: AlternativeChannel | null;
}

export interface PensionResult {
  eligible: boolean;
  claimable_now: boolean;
  payable_now: boolean;
  reason_code: string;
  reason: string;
  missing_documents: string[];
  next_action: string;
  matched_rule: string;
  sources: SourceRef[];
}

export interface RuleEvaluateResponse {
  days_to_departure: number | null;
  tasks: TaskSignal[];
  pension: PensionResult;
}

export interface WorkflowStep {
  step: number;
  task_id: string;
  label: string;
  priority: "REQUIRED" | "RECOMMENDED" | "INFO";
  edge_type?: string | null;
  note?: string | null;
}

export interface DeparturePlanResponse {
  ordered_steps: WorkflowStep[];
  product_categories: string[];
}

export interface ExpenseBreakdown {
  housing: number;
  food: number;
  communication: number;
  transportation: number;
  remittance: number;
  other: number;
}

export interface PlannerRequest {
  target_amount: number;
  current_savings: number;
  months_left: number;
  monthly_income: number;
  expenses: ExpenseBreakdown;
  meals_housing_provided: boolean;
}

export interface PlannerResponse {
  disposable_income: number;
  required_monthly_saving: number;
  goal_met: boolean;
  shortfall_amount: number;
  recommended_categories: string[];
}

export interface ActionItem {
  action_id: string;
  title: string;
  why: string;
  category: string;
}

export interface BriefingResponse {
  crisis_signals: Record<string, unknown>;
  ranked_actions: ActionItem[];
  top3_summary: string[];
  sources: SourceRef[];
  ai_generated: boolean;
}

export interface DDayItem {
  day_offset: number;
  label: string;
  task_id: string | null;
  is_recommended_not_legal: boolean;
  detail: string;
  requires_visit: boolean;
}

export interface DDayResponse {
  departure_date: string;
  days_left: number;
  items: DDayItem[];
}

export interface FinanceProduct {
  product_id: string;
  product_name: string;
  bank: string;
  product_type: string;
  product_category?: string | null;
  base_rate?: number | null;
  max_rate?: number | null;
  rate_as_of?: string | null;
  contract_months?: number | null;
  monthly_min_amount?: number | null;
  monthly_max_amount?: number | null;
  status: string;
  disclaimer: string;
  sources: SourceRef[];
}

export interface IntentResult {
  nationality: string;
  visa_type: string;
  residency_days_left?: number | null;
  intent_candidates: string[];
  documents_held: string[];
  available_time_slots: string[];
  confidence: number;
  context_used: boolean;
  out_of_scope: boolean;
}

export interface DemoPersona {
  name: string;
  profile: UserProfile;
  planner: PlannerRequest;
  documents_held: string[];
}

export interface UserFinanceProfile {
  nationality: string;
  visa_type: string;
  has_arc?: boolean | null;
  is_tax_resident?: boolean | null;
  tenure_months?: number | null;
  visa_remaining_months?: number | null;
  purpose?: string | null;
}

export interface ProductRecommendation {
  product_id: string;
  institution: string;
  product_name: string;
  category: string;
  reason_ko: string;
  eligibility_badge_ko: string;
  caution_ko?: string | null;
  source_url?: string | null;
}

export interface ProductRecommendationResponse {
  recommendations: ProductRecommendation[];
  ai_generated: boolean;
}

export interface FxRate {
  currency: string;
  rate: number;
  as_of: string;
}

export interface FxRatesResponse {
  base: string;
  rates: FxRate[];
  unsupported: string[];
  sources: SourceRef[];
  available: boolean;
  error?: string | null;
}

export interface BranchLocation {
  place_name: string;
  bank?: string | null;
  address?: string | null;
  road_address?: string | null;
  phone?: string | null;
  lat: number;
  lng: number;
  distance_m?: number | null;
  place_url?: string | null;
  sunday_branch: boolean;
  sunday_branch_note?: string | null;
  sunday_branch_source_id?: string | null;
}

export interface BranchSearchResponse {
  branches: BranchLocation[];
  available: boolean;
  error?: string | null;
  attribution: string;
}

export interface FxHistoryPoint {
  date: string;
  rate: number;
}

export interface FxHistoryResponse {
  currency: string;
  base: string;
  points: FxHistoryPoint[];
  sources: SourceRef[];
  available: boolean;
  error?: string | null;
}

export interface TrilingualText {
  ko: string;
  en: string;
  vi: string;
}

export interface GuideContent {
  guide_id: string;
  title: TrilingualText;
  summary: TrilingualText;
  steps: TrilingualText[];
  note: TrilingualText;
  sources: SourceRef[];
}

export interface MinWageInfo {
  year: number;
  hourly_wage: number;
  standard_monthly_hours: number;
  sources: SourceRef[];
  calculator_url: string;
}

export interface RemoteAccountOpening {
  institution: string;
  supported: "yes" | "pilot" | "unconfirmed";
  method_ko: string;
  conditions_ko: string;
  source_url: string;
  verified_at: string;
}

export interface MultilingualBranch {
  branch_id: string;
  bank: string;
  branch_name: string;
  address?: string | null;
  phone?: string | null;
  languages: string[];
  note?: string | null;
  verified: boolean;
  authority_grade: string;
  source_id: string;
  last_verified_at: string;
}
