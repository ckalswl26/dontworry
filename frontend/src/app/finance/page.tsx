"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card, ErrorNotice } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { RemoteAccountOpeningCard } from "@/components/RemoteAccountOpeningCard";
import { TermFitBadge } from "@/components/SignalBadge";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import {
  pickLang3,
  type FinanceProduct,
  type Lang,
  type PlannerResponse,
  type ProductRecommendation,
  type ProductRecommendationResponse,
} from "@/lib/types";

function monthsUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const totalDays = Math.round((target.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  return Math.floor(totalDays / 30);
}

const PURPOSE_TAGS: { value: string; ko: string; en: string; vi: string }[] = [
  { value: "저축", ko: "저축", en: "Savings", vi: "Tiết kiệm" },
  { value: "계좌개설", ko: "계좌개설", en: "Account", vi: "Mở tài khoản" },
  { value: "송금", ko: "송금", en: "Remittance", vi: "Chuyển tiền" },
  { value: "대출", ko: "대출", en: "Loan", vi: "Vay" },
  { value: "내집마련", ko: "내집마련", en: "Housing", vi: "Nhà ở" },
  { value: "투자", ko: "투자", en: "Investment", vi: "Đầu tư" },
  { value: "보장", ko: "보장", en: "Insurance", vi: "Bảo hiểm" },
];

function TriToggle({
  label,
  value,
  onChange,
  lang,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  lang: Lang;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1">
        {[
          { v: true as boolean | null, key: "yesLabel" },
          { v: false as boolean | null, key: "noLabel" },
          { v: null as boolean | null, key: "unknownLabel" },
        ].map((opt) => (
          <button
            key={String(opt.v)}
            onClick={() => onChange(opt.v)}
            className={`rounded-lg px-2 py-2 text-xs font-bold ${
              value === opt.v ? "bg-brand-navy text-white shadow-sm" : "text-slate-500 hover:bg-white"
            }`}
          >
            {t(lang, opt.key)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const router = useRouter();
  const { state, setConsultation, setSavingsTracking } = useStore();
  const lang = state.profile.language;

  const [hasArc, setHasArc] = useState<boolean | null>(null);
  const [isTaxResident, setIsTaxResident] = useState<boolean | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [confirmingRedId, setConfirmingRedId] = useState<string | null>(null);
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null);
  const [maturityEditId, setMaturityEditId] = useState<string | null>(null);
  const [maturityDraft, setMaturityDraft] = useState("");

  const hasPlannerGoal = state.planner.target_amount > 0;
  const { data: plannerResult } = useFetch<PlannerResponse | null>(
    () => (hasPlannerGoal ? api.plannerCalculate(state.planner) : Promise.resolve(null)),
    [hasPlannerGoal, state.planner]
  );
  const monthlySavingsTarget = plannerResult?.required_monthly_saving
    ? Math.round(plannerResult.required_monthly_saving)
    : null;

  const { data: savingsData, loading: savingsLoading, error: savingsFetchError } = useFetch(
    () => api.financeSavings(),
    []
  );
  const savings: FinanceProduct[] = savingsData?.products ?? [];
  const savingsError = savingsFetchError ?? savingsData?.error ?? null;

  const visaRemainingMonths = monthsUntil(state.profile.visa_expiry_date);

  const {
    data: recData,
    loading: recLoading,
    error: recError,
  } = useFetch<ProductRecommendationResponse>(
    () =>
      api.productsRecommend({
        nationality: state.profile.nationality,
        visa_type: state.profile.visa_type,
        has_arc: hasArc,
        is_tax_resident: isTaxResident,
        tenure_months: state.profile.tenure_months,
        visa_remaining_months: visaRemainingMonths,
        purpose,
        departure_date: state.profile.departure_date,
        monthly_savings_target: monthlySavingsTarget,
      }),
    [
      hasArc,
      isTaxResident,
      purpose,
      state.profile.nationality,
      state.profile.visa_type,
      state.profile.tenure_months,
      state.profile.departure_date,
      visaRemainingMonths,
      monthlySavingsTarget,
    ]
  );
  const recommendations = recData?.recommendations ?? [];
  const aiGenerated = recData?.ai_generated ?? false;
  const recommendedGroup = [...recommendations]
    .filter((r) => r.term_fit !== "RED")
    .sort((a, b) => b.term_fit_score - a.term_fit_score);
  const cautionGroup = recommendations.filter((r) => r.term_fit === "RED");

  const addToConsultCard = (r: ProductRecommendation) => {
    if (r.term_fit === "RED" && confirmingRedId !== r.product_id) {
      setConfirmingRedId(r.product_id);
      return;
    }
    setConfirmingRedId(null);
    setConsultation({
      productName: r.product_name,
      productReasonKo: r.reason_ko,
      productEligibilityBadgeKo: r.eligibility_badge_ko,
      ready: false,
    });
    router.push("/consult-card");
  };

  const saveMaturity = (r: ProductRecommendation) => {
    if (!maturityDraft) return;
    setSavingsTracking({ productName: r.product_name, maturityDate: maturityDraft });
    setMaturityEditId(null);
    setMaturityDraft("");
  };

  const renderProductCard = (r: ProductRecommendation) => (
    <Card key={r.product_id} className="!p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold text-brand-navy">{r.product_name}</p>
        <button
          type="button"
          onClick={() => setExpandedScoreId(expandedScoreId === r.product_id ? null : r.product_id)}
          className="shrink-0 rounded-full bg-brand-navy px-2.5 py-1 text-[11px] font-bold text-white"
        >
          체류기간 적합도 {r.term_fit_score}점
        </button>
      </div>
      <p className="mt-0.5 text-[11px] text-gray-500">
        {r.institution} · {r.category}
      </p>
      {r.is_sample_data && (
        <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          ⚠ 샘플 데이터
        </span>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-brand-blue">
          {r.eligibility_badge_ko}
        </span>
        {r.term_fit && <TermFitBadge termFit={r.term_fit} />}
      </div>

      {expandedScoreId === r.product_id && (
        <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-600">
          {r.term_fit_score_reasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs leading-5 text-gray-600">{r.reason_ko}</p>
      {r.term_fit === "RED" && (
        <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs leading-5 text-brand-red">
          출국 예정일보다 만기가 늦어요. 중도해지 시 약정금리 대신 중도해지 이자율이 적용돼 손실이 발생할 수 있어요.
          정확한 중도해지 조건은 반드시 가입 시 은행에 확인하세요.
        </p>
      )}
      {r.caution_ko && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-700">⚠ {r.caution_ko}</p>
      )}
      {r.source_url && (
        <a
          href={r.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-xs text-brand-blue underline"
        >
          {t(lang, "sourceDetail")}
        </a>
      )}

      {confirmingRedId === r.product_id && (
        <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs leading-5 text-brand-red">
          이 상품은 출국예정일 이후에 만기가 도래해요. 만기 전에 해지하면 약정금리 대신 중도해지 이자율이
          적용돼 손실이 발생할 수 있어요. 정확한 중도해지 조건은 반드시 가입 시 은행에 확인하세요.
        </p>
      )}

      {state.savingsTracking.productName === r.product_name && state.savingsTracking.maturityDate ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700">
          ✓ 만기일 저장됨: {state.savingsTracking.maturityDate} (홈 화면에서 D-Day로 확인할 수 있어요)
          <button
            type="button"
            onClick={() => setSavingsTracking({ productName: "", maturityDate: null })}
            className="ml-2 text-emerald-600 underline"
          >
            삭제
          </button>
        </p>
      ) : maturityEditId === r.product_id ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={maturityDraft}
            onChange={(e) => setMaturityDraft(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() => saveMaturity(r)}
            className="shrink-0 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-bold text-white"
          >
            저장
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMaturityEditId(r.product_id);
            setMaturityDraft("");
          }}
          className="mt-2 text-xs text-brand-blue underline"
        >
          이 상품 가입하면 만기일 저장하기
        </button>
      )}

      <div className={`mt-2 grid ${confirmingRedId === r.product_id ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
        <button
          type="button"
          onClick={() => addToConsultCard(r)}
          className={`w-full rounded-xl py-2 text-xs font-bold ${
            confirmingRedId === r.product_id ? "bg-brand-red text-white" : "border border-brand-blue text-brand-blue"
          }`}
        >
          {confirmingRedId === r.product_id ? "그래도 상담카드에 담기" : "🏦 상담카드에 담기"}
        </button>
        {confirmingRedId === r.product_id && (
          <button
            type="button"
            onClick={() => setConfirmingRedId(null)}
            className="w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-500"
          >
            취소
          </button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="체류기간 맞춤 예적금 플래너" onBack={() => router.back()} />

      <div className="flex-1 px-5 pb-28 pt-6">
        <p className="text-xs text-gray-400">{t(lang, "productDisclaimer")}</p>

        {recData?.usable_window_message_ko && (
          <Card className="mt-3 border-brand-blue/15 bg-brand-sky/40">
            <p className="text-sm font-bold text-brand-navy">
              {state.profile.name ? `${state.profile.name}님은 ` : ""}
              {state.profile.departure_date && (
                <>출국까지 {monthsUntil(state.profile.departure_date)}개월 남았어요. </>
              )}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{recData.usable_window_message_ko}</p>
          </Card>
        )}

        <RemoteAccountOpeningCard />

        <Card className="mt-4 !p-4">
          <div className="flex flex-col gap-4">
            <TriToggle label={t(lang, "hasArcLabel")} value={hasArc} onChange={setHasArc} lang={lang} />
            <TriToggle label={t(lang, "isTaxResidentLabel")} value={isTaxResident} onChange={setIsTaxResident} lang={lang} />
            <div>
              <p className="text-xs font-semibold text-slate-600">{t(lang, "purposeLabel")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setPurpose(null)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    purpose === null ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {t(lang, "allLabel")}
                </button>
                {PURPOSE_TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    onClick={() => setPurpose(purpose === tag.value ? null : tag.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      purpose === tag.value ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {pickLang3(tag, lang)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-sm font-extrabold text-brand-navy">{t(lang, "myRecommendedProducts")}</p>
        {!aiGenerated && !recLoading && recommendations.length > 0 && (
          <p className="mt-1 text-[11px] text-gray-400">{t(lang, "ruleBasedFallbackNote")}</p>
        )}
        {recLoading && <div className="mt-3 h-24 animate-pulse rounded-xl2 bg-slate-100" />}
        {!recLoading && recError && <ErrorNotice message={recError} />}
        {!recLoading && !recError && recommendations.length === 0 && (
          <div className="mt-2 rounded-xl2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p>{t(lang, "noMatchingProducts")}</p>
            {state.profile.tenure_months === null && (
              <button onClick={() => router.push("/onboarding")} className="mt-1 block underline">
                {t(lang, "fillTenureHint")}
              </button>
            )}
          </div>
        )}

        {!recLoading && !recError && recommendedGroup.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-bold text-brand-blue">✓ 추천 가능 범위</p>
            <div className="mt-2 flex flex-col gap-3">{recommendedGroup.map(renderProductCard)}</div>
          </div>
        )}

        {!recLoading && !recError && cautionGroup.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-amber-600">⚠ 주의가 필요한 상품</p>
            <div className="mt-2 flex flex-col gap-3">
              {cautionGroup.map((r) => (
                <div key={r.product_id}>
                  <p className="mb-1.5 text-[11px] leading-4 text-amber-700">
                    출국 예정일보다 만기가 늦어요. 중도해지 시 약정금리를 받지 못할 수 있어요.
                  </p>
                  {renderProductCard(r)}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-sm font-extrabold text-brand-navy">금융감독원 공시 적금 상품</p>
        {savingsLoading && <p className="mt-2 text-sm text-gray-400">...</p>}
        {savingsError && (
          <p className="mt-2 text-sm text-gray-400">
            지금은 실시간 상품 조회를 불러올 수 없어요. 잠시 후 다시 시도해주세요.
          </p>
        )}
        {!savingsLoading && !savingsError && savings.some((p) => p.is_sample_data) && (
          <p className="mt-1 text-[11px] font-semibold text-amber-600">
            ⚠ 실제 공시 데이터를 아직 연동하지 못해 샘플 데이터로 보여드리고 있어요.
          </p>
        )}
        <div className="mt-2 flex flex-col gap-3">
          {savings.slice(0, 15).map((p) => (
            <Card key={p.product_id} className="!p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-bold text-brand-navy">{p.product_name}</p>
                {p.is_sample_data && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    샘플 데이터
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{p.bank}</p>
              {(p.base_rate || p.max_rate) && (
                <p className="mt-1 text-sm text-brand-blue">
                  {p.base_rate}% ~ {p.max_rate}%
                </p>
              )}
              {!p.is_whitelisted && (
                <p className="mt-1.5 text-[11px] text-amber-600">⚠ 외국인 가입 가능 여부 확인 필요</p>
              )}
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
