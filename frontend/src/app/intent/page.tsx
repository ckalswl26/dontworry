"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, ErrorNotice, QuickReplyButton } from "@/components/Card";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
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

// confidence가 이 값 미만이면 요약을 바로 확정하지 않고 후보를 직접 고르게 한다.
const CONFIDENCE_THRESHOLD = 0.6;

// intent_candidates가 아예 비어 있을 때 보여줄 자주 찾는 화면들. 이미 존재하는
// 화면으로만 라우팅한다 - 새 화면을 만들지 않는다.
const FALLBACK_CATEGORIES: { labelKey: string; route: string }[] = [
  { labelKey: "taskResult", route: "/tasks" },
  { labelKey: "relatedProducts", route: "/finance" },
  { labelKey: "briefingTitle", route: "/briefing" },
  { labelKey: "plannerShortcut", route: "/planner" },
];

export default function IntentPage() {
  const router = useRouter();
  const { state, setProfile } = useStore();
  const lang = state.profile.language;

  const { data: result, loading, error } = useFetch<IntentResult>(
    () => api.intent({ text: state.lastQuestion, profile: state.profile }),
    [state.lastQuestion]
  );

  const days = result?.residency_days_left;

  // 확정된 intent의 국적/체류자격을 스토어에 반영한 뒤, 실제 데이터를 가진
  // 기존 화면으로 이동한다. LLM이 여기서 새 답변을 만들어내지 않는다.
  const applyAndNavigate = (route: string) => {
    if (result) {
      setProfile({ nationality: result.nationality, visa_type: result.visa_type });
    }
    router.push(route);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "confirmQuestion")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        <p className="text-xs text-gray-400">{t(lang, "inputQuestion")}</p>
        <div className="mt-2 rounded-xl2 bg-brand-gray p-4 text-sm text-brand-navy">&quot;{state.lastQuestion}&quot;</div>

        {loading && <p className="mt-6 text-sm text-gray-400">{t(lang, "analyzingText")}</p>}
        {!loading && error && (
          <div className="mt-6">
            <ErrorNotice message={error} />
          </div>
        )}

        {!loading && !error && result && result.intent_candidates.length === 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-500">{t(lang, "notUnderstoodTitle")}</p>
            <div className="mt-3 flex flex-col gap-2">
              {FALLBACK_CATEGORIES.map((c) => (
                <QuickReplyButton key={c.route} onClick={() => router.push(c.route)}>
                  {t(lang, c.labelKey)}
                </QuickReplyButton>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && result && result.intent_candidates.length > 0 && result.confidence < CONFIDENCE_THRESHOLD && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-500">{t(lang, "pickCandidateTitle")}</p>
            <div className="mt-3 flex flex-col gap-2">
              {result.intent_candidates.map((c) => (
                <QuickReplyButton key={c} onClick={() => applyAndNavigate(`/tasks/${c}`)}>
                  {TASK_LABELS[c] ?? c}
                </QuickReplyButton>
              ))}
            </div>
            <div className="mt-3">
              <QuickReplyButton onClick={() => router.back()}>{t(lang, "reinput")}</QuickReplyButton>
            </div>
          </div>
        )}

        {!loading && !error && result && result.intent_candidates.length > 0 && result.confidence >= CONFIDENCE_THRESHOLD && (
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

      {!loading &&
        !error &&
        result &&
        result.intent_candidates.length > 0 &&
        result.confidence >= CONFIDENCE_THRESHOLD && (
          <div className="flex flex-col gap-2 px-5 pb-8">
            <QuickReplyButton variant="primary" onClick={() => applyAndNavigate("/tasks")}>
              {t(lang, "confirmYes")}
            </QuickReplyButton>
            <QuickReplyButton onClick={() => router.back()}>{t(lang, "reinput")}</QuickReplyButton>
          </div>
        )}
    </div>
  );
}
