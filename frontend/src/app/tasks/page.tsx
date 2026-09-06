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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.onboarded) {
      setLoading(false);
      setError("PROFILE_MISSING");
      return;
    }
    api
      .rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld ?? [] })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "taskResult")} onBack={() => router.back()} />
      <p className="px-5 pt-4 text-sm text-gray-500">{t(lang, "taskResultDesc")}</p>
      <div className="flex-1 px-5 py-4">
        {loading && <p className="text-sm text-gray-400">...</p>}

        {error === "PROFILE_MISSING" && (
          <div className="rounded-xl2 border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            국적/체류자격 정보가 없어요. 온보딩을 먼저 완료해주세요.
            <button className="mt-2 block underline" onClick={() => router.push("/onboarding")}>
              온보딩으로 이동
            </button>
          </div>
        )}

        {error && error !== "PROFILE_MISSING" && (
          <div className="rounded-xl2 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            데이터를 불러오지 못했어요: {error}
          </div>
        )}

        {!loading && !error && data?.tasks.length === 0 && (
          <p className="text-sm text-gray-400">표시할 업무가 없어요.</p>
        )}

        <div className="flex flex-col gap-3">
          {data?.tasks.map((task) => (
            <button
              key={task.task_id}
              onClick={() => router.push(`/tasks/${task.task_id}`)}
              className="flex items-center justify-between rounded-xl2 border border-gray-100 px-4 py-4 text-left shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-navy">{task.label}</p>
                <p className="mt-1 text-xs text-gray-500">{task.reason}</p>
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
