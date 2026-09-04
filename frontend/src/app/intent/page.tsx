"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, PrimaryButton } from "@/components/Card";
import { api } from "@/lib/api";
import type { IntentResult } from "@/lib/types";

const TASK_LABELS: Record<string, string> = {
  departure_notification: "출국예정신고",
  departure_confirmation: "출국예정사실확인서",
  return_cost_insurance: "귀국비용보험",
  maturity_insurance: "출국만기보험",
  pension_refund: "국민연금 반환일시금",
  overseas_remittance: "해외송금",
  account_closure: "계좌 정리",
};

export default function IntentPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;
  const [result, setResult] = useState<IntentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .intent({ text: state.lastQuestion, profile: state.profile })
      .then(setResult)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = result?.residency_days_left;

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "confirmQuestion")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        <p className="text-xs text-gray-400">{t(lang, "inputQuestion")}</p>
        <div className="mt-2 rounded-xl2 bg-brand-gray p-4 text-sm text-brand-navy">&quot;{state.lastQuestion}&quot;</div>

        {loading && <p className="mt-6 text-sm text-gray-400">...</p>}
        {error && <p className="mt-6 text-sm text-brand-red">서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.</p>}

        {result && (
          <>
            <p className="mt-6 text-sm font-semibold text-gray-500">{t(lang, "understood")}</p>
            <div className="mt-2 divide-y divide-gray-100 rounded-xl2 border border-gray-100">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-500">{t(lang, "visaType")}</span>
                <span className="font-bold">{result.visa_type}</span>
              </div>
              {days !== null && days !== undefined && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-500">{t(lang, "daysToDeparture")}</span>
                  <span className="font-bold">D-{days}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-500">{t(lang, "visitTime")}</span>
                <span className="font-bold">
                  {result.available_time_slots.length ? result.available_time_slots.join(", ") : "-"}
                </span>
              </div>
            </div>

            <p className="mt-6 text-sm font-semibold text-gray-500">
              {t(lang, "relatedTasks")} {result.intent_candidates.length}건
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.intent_candidates.map((c) => (
                <span key={c} className="rounded-full border border-gray-200 px-3 py-2 text-sm">
                  {TASK_LABELS[c] ?? c}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">{t(lang, "editHint")}</p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 px-5 pb-8">
        <PrimaryButton onClick={() => router.push("/tasks")} disabled={!result}>
          {t(lang, "confirmYes")}
        </PrimaryButton>
        <button onClick={() => router.back()} className="w-full rounded-xl2 border border-gray-200 py-3 text-sm">
          {t(lang, "reinput")}
        </button>
      </div>
    </div>
  );
}
