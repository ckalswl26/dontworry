"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, PrimaryButton } from "@/components/Card";
import { SignalBadge } from "@/components/SignalBadge";
import { api } from "@/lib/api";
import type { RuleEvaluateResponse } from "@/lib/types";

export default function TasksPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;
  const [data, setData] = useState<RuleEvaluateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld })
      .then(setData)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "taskResult")} onBack={() => router.back()} />
      <p className="px-5 pt-4 text-sm text-gray-500">{t(lang, "taskResultDesc")}</p>

      <div className="flex-1 px-5 py-4">
        {loading && <p className="text-sm text-gray-400">...</p>}
        <div className="flex flex-col gap-3">
          {data?.tasks.map((task) => (
            <button
              key={task.task_id}
              onClick={() => router.push(`/tasks/${task.task_id}`)}
              className="flex items-center justify-between rounded-xl2 border border-gray-100 px-4 py-4 text-left shadow-sm"
            >
              <div>
                <p className="font-semibold text-brand-navy">{task.label}</p>
                <p className="mt-1 max-w-[220px] text-xs text-gray-500">{task.reason}</p>
              </div>
              <SignalBadge signal={task.signal} lang={lang} />
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-8">
        <PrimaryButton onClick={() => router.push("/timeline")} disabled={!data}>
          {t(lang, "viewOrder")}
        </PrimaryButton>
      </div>
    </div>
  );
}
