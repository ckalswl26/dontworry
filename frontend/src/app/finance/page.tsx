"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card, ErrorNotice } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { FinanceProduct, ProductRecommendationResponse } from "@/lib/types";

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
  lang: "ko" | "en" | "vi";
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-1 flex gap-1.5">
        {[
          { v: true as boolean | null, key: "yesLabel" },
          { v: false as boolean | null, key: "noLabel" },
          { v: null as boolean | null, key: "unknownLabel" },
        ].map((opt) => (
          <button
            key={String(opt.v)}
            onClick={() => onChange(opt.v)}
            className={`rounded-full border px-3 py-1 text-xs ${
              value === opt.v ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200 text-gray-600"
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
  const { state } = useStore();
  const lang = state.profile.language;

  const [hasArc, setHasArc] = useState<boolean | null>(null);
  const [isTaxResident, setIsTaxResident] = useState<boolean | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);

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
      }),
    [
      hasArc,
      isTaxResident,
      purpose,
      state.profile.nationality,
      state.profile.visa_type,
      state.profile.tenure_months,
      visaRemainingMonths,
    ]
  );
  const recommendations = recData?.recommendations ?? [];
  const aiGenerated = recData?.ai_generated ?? false;

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "relatedProducts")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        <p className="text-xs text-gray-400">{t(lang, "productDisclaimer")}</p>

        <Card className="mt-4">
          <div className="flex flex-col gap-3">
            <TriToggle label={t(lang, "hasArcLabel")} value={hasArc} onChange={setHasArc} lang={lang} />
            <TriToggle label={t(lang, "isTaxResidentLabel")} value={isTaxResident} onChange={setIsTaxResident} lang={lang} />
            <div>
              <p className="text-xs text-gray-500">{t(lang, "purposeLabel")}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setPurpose(null)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    purpose === null ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {t(lang, "allLabel")}
                </button>
                {PURPOSE_TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    onClick={() => setPurpose(purpose === tag.value ? null : tag.value)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      purpose === tag.value ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {tag[lang] ?? tag.ko}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-sm font-semibold text-gray-500">{t(lang, "myRecommendedProducts")}</p>
        {!aiGenerated && !recLoading && recommendations.length > 0 && (
          <p className="mt-1 text-[11px] text-gray-400">{t(lang, "ruleBasedFallbackNote")}</p>
        )}
        {recLoading && <p className="mt-2 text-sm text-gray-400">...</p>}
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
        <div className="mt-2 flex flex-col gap-3">
          {recommendations.map((r) => (
            <Card key={r.product_id}>
              <p className="font-semibold text-brand-navy">{r.product_name}</p>
              <p className="text-xs text-gray-500">
                {r.institution} · {r.category}
              </p>
              <span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-brand-blue">
                {r.eligibility_badge_ko}
              </span>
              <p className="mt-2 text-sm text-gray-600">{r.reason_ko}</p>
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
            </Card>
          ))}
        </div>

        <p className="mt-6 text-sm font-semibold text-gray-500">금융감독원 공시 적금 상품</p>
        {savingsLoading && <p className="mt-2 text-sm text-gray-400">...</p>}
        {savingsError && (
          <p className="mt-2 text-sm text-gray-400">
            지금은 실시간 상품 조회를 불러올 수 없어요. 잠시 후 다시 시도해주세요.
          </p>
        )}
        <div className="mt-2 flex flex-col gap-3">
          {savings.slice(0, 15).map((p) => (
            <Card key={p.product_id}>
              <p className="font-semibold text-brand-navy">{p.product_name}</p>
              <p className="text-xs text-gray-500">{p.bank}</p>
              {(p.base_rate || p.max_rate) && (
                <p className="mt-1 text-sm text-brand-blue">
                  {p.base_rate}% ~ {p.max_rate}%
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
