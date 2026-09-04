"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card, PrimaryButton } from "@/components/Card";
import { SignalBadge } from "@/components/SignalBadge";
import { api } from "@/lib/api";
import type { RuleEvaluateResponse, TaskSignal } from "@/lib/types";

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { state, setDocumentsHeld } = useStore();
  const lang = state.profile.language;
  const [data, setData] = useState<RuleEvaluateResponse | null>(null);
  const [held, setHeld] = useState<Set<string>>(new Set(state.documentsHeld));

  useEffect(() => {
    api.rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld }).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={task?.label ?? t(lang, "checklist")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        {task && (
          <>
            <div className="flex items-center justify-between">
              <SignalBadge signal={task.signal} lang={lang} />
              {task.responsible_org && <span className="text-xs text-gray-400">{task.responsible_org}</span>}
            </div>
            <p className="mt-3 text-sm text-gray-600">{task.reason}</p>

            {total > 0 && (
              <Card className="mt-5">
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
              </Card>
            )}

            {task.sources.length > 0 && (
              <div className="mt-5">
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

      <div className="px-5 pb-8">
        <PrimaryButton onClick={() => router.push("/finance")}>{t(lang, "relatedProducts")}</PrimaryButton>
      </div>
    </div>
  );
}
