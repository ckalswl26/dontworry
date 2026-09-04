"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card } from "@/components/Card";
import { api } from "@/lib/api";
import type { BriefingResponse } from "@/lib/types";

export default function BriefingPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .briefing({
        profile: state.profile,
        documents_held: state.documentsHeld,
        planner: state.planner.target_amount > 0 ? state.planner : null,
      })
      .then(setData)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "briefingTitle")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        {loading && <p className="text-sm text-gray-400">...</p>}

        {data && (
          <>
            <Card className="border-none bg-brand-navy text-white">
              <p className="text-xs text-white/70">{state.profile.nationality} · {state.profile.visa_type}</p>
              <p className="mt-2 text-lg font-bold">{t(lang, "top3")}</p>
              {!data.ai_generated && (
                <p className="mt-1 text-[11px] text-white/50">규칙 기반 기본 우선순위 (AI 미연결 시 대체)</p>
              )}
            </Card>

            <div className="mt-4 flex flex-col gap-3">
              {data.top3_summary.map((line, i) => (
                <Card key={i}>
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-xs font-bold text-brand-navy">
                      {i + 1}
                    </span>
                    <p className="text-sm text-brand-navy">{line}</p>
                  </div>
                </Card>
              ))}
            </div>

            <p className="mt-6 text-xs text-gray-400">{t(lang, "disclaimerBriefing")}</p>

            {data.sources.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.sources.map((s) => (
                  <button
                    key={s.source_id}
                    onClick={() => router.push(`/sources/${s.source_id}`)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-[11px] text-gray-500"
                  >
                    {s.organization}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
