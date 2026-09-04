"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card, ErrorNotice, PrimaryButton } from "@/components/Card";
import { SignalBadge } from "@/components/SignalBadge";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { RuleEvaluateResponse, TaskSignal } from "@/lib/types";

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { state, setDocumentsHeld } = useStore();
  const lang = state.profile.language;
  const [held, setHeld] = useState<Set<string>>(new Set(state.documentsHeld));

  const { data, loading, error } = useFetch<RuleEvaluateResponse>(
    () => api.rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld }),
    []
  );

  const task: TaskSignal | undefined = data?.tasks.find((tk) => tk.task_id === params.id);

  const toggleDoc = (doc: string) => {
    const next = new Set(held);
    if (next.has(doc)) next.delete(doc);
    else next.add(doc);
    setHeld(next);
    setDocumentsHeld(Array.from(next));
  };

  const total = task?.required_documents.length ?? 0;
  const heldCount = task?.required_documents.filter((d) => held.has(d)).length ?? 0;
  const pct = total ? Math.round((heldCount / total) * 100) : 100;

  const requiresVisit = task?.channel === "BRANCH_VISIT" || task?.channel === "BRANCH_VISIT_OR_MAIL";
  const printedAt = new Date().toLocaleString(lang === "ko" ? "ko-KR" : lang === "vi" ? "vi-VN" : "en-US");

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={task?.label ?? t(lang, "checklist")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        {loading && <p className="text-sm text-gray-400">...</p>}
        {!loading && error && <ErrorNotice message={error} />}

        {task && (
          <>
            <div className="print:hidden flex items-center justify-between">
              <SignalBadge signal={task.signal} lang={lang} />
              {task.responsible_org && <span className="text-xs text-gray-400">{task.responsible_org}</span>}
            </div>
            <p className="print:hidden mt-3 text-sm text-gray-600">{task.reason}</p>

            {requiresVisit && task.alternative_channel && (
              <Card className="print:hidden mt-4 border-brand-blue/30 bg-blue-50/50">
                <p className="text-xs font-semibold text-brand-blue">{t(lang, "alternativeChannelLabel")}</p>
                <p className="mt-1 font-semibold text-brand-navy">{task.alternative_channel.name}</p>
                {task.alternative_channel.description && (
                  <p className="mt-1 text-sm text-gray-600">{task.alternative_channel.description}</p>
                )}
                <div className="mt-3 flex flex-col gap-2">
                  {task.alternative_channel.url && (
                    <a
                      href={task.alternative_channel.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full rounded-xl bg-brand-blue py-2.5 text-center text-sm font-semibold text-white"
                    >
                      {t(lang, "openAlternativeChannel")}
                    </a>
                  )}
                  {task.alternative_channel.phone && (
                    <a
                      href={`tel:${task.alternative_channel.phone}`}
                      className="block w-full rounded-xl border border-brand-blue py-2.5 text-center text-sm font-semibold text-brand-blue"
                    >
                      📞 {task.alternative_channel.phone}
                    </a>
                  )}
                </div>
              </Card>
            )}

            {total > 0 && (
              <Card className="print:hidden mt-5">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-brand-blue text-sm font-bold text-brand-navy">
                    {pct}%
                  </div>
                  <div>
                    <p className="font-semibold text-brand-navy">{t(lang, "readiness")}</p>
                    <p className="text-xs text-gray-500">
                      {total - heldCount}
                      {t(lang, "missingCount")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col divide-y divide-gray-100">
                  {task.required_documents.map((doc) => (
                    <label key={doc} className="flex items-center gap-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={held.has(doc)}
                        onChange={() => toggleDoc(doc)}
                        className="h-4 w-4 accent-brand-navy"
                      />
                      {doc.replaceAll("_", " ")}
                    </label>
                  ))}
                </div>

                {requiresVisit && (
                  <button
                    onClick={() => window.print()}
                    className="print:hidden mt-4 w-full rounded-xl border border-brand-blue py-2.5 text-sm font-semibold text-brand-blue"
                  >
                    🖨 {t(lang, "buildVisitChecklist")}
                  </button>
                )}
              </Card>
            )}

            {/* 인쇄/PDF 저장 전용 뷰 - 평소엔 보이지 않고 window.print() 시에만 렌더링된다 */}
            {task && total > 0 && (
              <div className="hidden print:block">
                <h2 className="text-lg font-bold text-brand-navy">{t(lang, "printedChecklistTitle")}</h2>
                <p className="mt-1 text-sm text-gray-600">{task.label}</p>
                <p className="mt-3 text-sm">
                  {t(lang, "readiness")}: {pct}%
                </p>
                <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                  {task.required_documents.map((doc) => (
                    <li key={doc}>
                      {held.has(doc) ? "☑" : "☐"} {doc.replaceAll("_", " ")}
                    </li>
                  ))}
                </ul>
                {task.sources.length > 0 && (
                  <p className="mt-4 text-xs text-gray-500">
                    {t(lang, "judgementBasis")}:{" "}
                    {task.sources.map((s) => `${s.organization} (${s.last_verified_at})`).join(", ")}
                  </p>
                )}
                <p className="mt-4 text-[11px] text-gray-400">
                  Don&apos;t ₩orry · {printedAt}
                </p>
              </div>
            )}

            {task.sources.length > 0 && (
              <div className="print:hidden mt-5">
                <p className="text-xs font-semibold text-gray-400">{t(lang, "judgementBasis")}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {task.sources.map((s) => (
                    <button
                      key={s.source_id}
                      onClick={() => router.push(`/sources/${s.source_id}`)}
                      className="rounded-xl border border-gray-100 px-3 py-2 text-left text-xs text-gray-500"
                    >
                      {s.organization} · {s.title} ({s.last_verified_at} 확인)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="print:hidden px-5 pb-8">
        <PrimaryButton onClick={() => router.push("/finance")}>{t(lang, "relatedProducts")}</PrimaryButton>
      </div>
    </div>
  );
}
