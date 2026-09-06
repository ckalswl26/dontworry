"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { codeLabel, t } from "@/lib/i18n";
import { BackHeader, Card, ErrorNotice, QuickReplyButton } from "@/components/Card";
import { SignalBadge } from "@/components/SignalBadge";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { IntentResult, RuleEvaluateResponse } from "@/lib/types";
import { Mascot } from "@/components/Logo";

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
  const { state, setProfile, confirmIntent, resetConversation } = useStore();
  const lang = state.profile.language;
  const confirmedRef = useRef<string | null>(null);
  const [chosenIntent, setChosenIntent] = useState<string | null>(null);

  const { data: result, loading, error } = useFetch<IntentResult>(
    () => api.intent({
      text: state.lastQuestion,
      profile: state.profile,
      last_confirmed_intent: state.lastConfirmedIntent,
      conversation_context: state.conversationContext,
    }),
    [state.lastQuestion]
  );
  const { data: rules } = useFetch<RuleEvaluateResponse>(
    () => api.rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld }), []
  );

  const days = result?.residency_days_left;
  const resolvedIntent = chosenIntent ?? (result?.intent_candidates.length === 1 ? result.intent_candidates[0] : null);
  const confirmedTask = resolvedIntent ? rules?.tasks.find((task) => task.task_id === resolvedIntent) : undefined;
  const hasConfirmedResult = Boolean(chosenIntent || (result && result.confidence >= CONFIDENCE_THRESHOLD));

  useEffect(() => {
    if (result && result.confidence >= CONFIDENCE_THRESHOLD && result.intent_candidates.length === 1 && confirmedRef.current !== result.intent_candidates[0]) {
      confirmedRef.current = result.intent_candidates[0];
      confirmIntent(result.intent_candidates[0]);
    }
  }, [result, confirmIntent]);

  // 확정된 intent의 국적/체류자격을 스토어에 반영한 뒤, 실제 데이터를 가진
  // 기존 화면으로 이동한다. LLM이 여기서 새 답변을 만들어내지 않는다.
  const applyAndNavigate = (route: string) => {
    if (result) {
      setProfile({ nationality: result.nationality, visa_type: result.visa_type });
      if (result.intent_candidates.length === 1) confirmIntent(result.intent_candidates[0]);
    }
    router.push(route);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "confirmQuestion")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-6">
        <p className="text-xs text-gray-400">{t(lang, "inputQuestion")}</p>
        <div className="mt-2 rounded-xl2 bg-brand-gray p-4 text-sm text-brand-navy shadow-sm">&quot;{state.lastQuestion}&quot;</div>

        <div className="mt-5 flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-brand-sky shadow-sm"><Mascot size={40} className="h-full w-full scale-125 object-contain" /></div>
          <div className="rounded-xl2 rounded-tl-md bg-brand-sky px-4 py-3 text-sm font-medium text-brand-navy">
            {loading ? t(lang, "analyzingText") : t(lang, "confirmQuestion")}
          </div>
        </div>

        {loading && <p className="mt-6 text-sm text-gray-400">{t(lang, "analyzingText")}</p>}
        {!loading && error && (
          <div className="mt-6">
            <ErrorNotice message={error} />
          </div>
        )}

        {!loading && !error && result?.out_of_scope && (
          <Card className="mt-6 border-amber-100 bg-amber-50/60">
            <p className="text-sm font-bold text-brand-navy">이 부분은 저희가 확인해드릴 수 있는 범위 밖이에요.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">정확한 내용은 은행에 직접 문의해주세요. 방문 시 활용할 사전상담 카드는 준비해드릴 수 있어요.</p>
            <button onClick={() => router.push("/consult-card")} className="mt-4 w-full rounded-xl bg-brand-navy py-3 text-sm font-bold text-white">사전상담 카드 만들기</button>
          </Card>
        )}

        {!loading && !error && result && !result.out_of_scope && result.intent_candidates.length === 0 && (
          <div className="mt-6">
            <p className="text-sm font-extrabold text-brand-navy">{t(lang, "notUnderstoodTitle")}</p>
            <div className="mt-3 flex flex-col gap-2">
              {FALLBACK_CATEGORIES.map((c) => (
                <QuickReplyButton key={c.route} onClick={() => router.push(c.route)}>
                  {t(lang, c.labelKey)}
                </QuickReplyButton>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && result && !chosenIntent && result.intent_candidates.length > 0 && result.confidence < CONFIDENCE_THRESHOLD && (
          <div className="mt-6">
            <p className="text-sm font-extrabold text-brand-navy">{t(lang, "pickCandidateTitle")}</p>
            <div className="mt-3 flex flex-col gap-2">
              {result.intent_candidates.map((c) => (
                <QuickReplyButton key={c} onClick={() => { setChosenIntent(c); confirmIntent(c); }}>
                  {TASK_LABELS[c] ?? c}
                </QuickReplyButton>
              ))}
            </div>
            <div className="mt-3">
              <QuickReplyButton onClick={() => router.back()}>{t(lang, "reinput")}</QuickReplyButton>
            </div>
          </div>
        )}

        {!loading && !error && result && result.intent_candidates.length > 0 && hasConfirmedResult && (
          <>
            <p className="mt-6 text-sm font-extrabold text-brand-navy">{t(lang, "understood")}</p>
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
                  {result.available_time_slots.length ? result.available_time_slots.map((code) => codeLabel(lang, code)).join(", ") : "-"}
                </span>
              </div>
            </div>

            <p className="mt-6 text-sm font-extrabold text-brand-navy">
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

            {confirmedTask && (
              <Card className="mt-5 border-brand-blue/15 bg-brand-sky/30">
                <div className="flex items-center justify-between gap-3"><p className="font-bold text-brand-navy">{confirmedTask.label}</p><SignalBadge signal={confirmedTask.signal} lang={lang} /></div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{confirmedTask.reason}</p>
                <p className="mt-3 text-xs font-semibold text-slate-400">근거: {confirmedTask.sources.map((source) => source.title).filter(Boolean).join(", ") || "확인 가능한 근거 없음"}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {confirmedTask.required_documents.length > 0 && <button onClick={() => router.push(`/tasks/${confirmedTask.task_id}`)} className="rounded-xl border border-brand-blue py-2.5 text-xs font-bold text-brand-blue">체크리스트 만들기</button>}
                  <button onClick={() => router.push(`/tasks/${confirmedTask.task_id}`)} className="rounded-xl bg-brand-navy py-2.5 text-xs font-bold text-white">자세히 보기</button>
                </div>
              </Card>
            )}
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
      <button onClick={() => { resetConversation(); router.push("/chat"); }} className="mx-auto mb-5 text-xs font-semibold text-slate-400 underline underline-offset-4">{t(lang, "reinput")}</button>
    </div>
  );
}
