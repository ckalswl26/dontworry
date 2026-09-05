"use client";

import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { BackHeader, Card, ErrorNotice } from "@/components/Card";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import { pickLang3, type GuideContent } from "@/lib/types";

export default function GuidePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { state } = useStore();
  const lang = state.profile.language;

  const { data, loading, error } = useFetch<GuideContent>(() => api.guide(params.id), [params.id]);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={data ? pickLang3(data.title, lang) : "..."} onBack={() => router.back()} />
      <div className="flex-1 px-5 py-5">
        {loading && <p className="text-sm text-gray-400">...</p>}
        {!loading && error && <ErrorNotice message={error} />}
        {!loading && !error && data && (
          <>
            <p className="text-sm leading-6 text-slate-600">{pickLang3(data.summary, lang)}</p>

            <div className="mt-4 flex flex-col gap-3">
              {data.steps.map((step, i) => (
                <Card key={i}>
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-700">{pickLang3(step, lang)}</p>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="mt-3 border-amber-100 bg-amber-50/60">
              <p className="text-sm leading-6 text-amber-800">{pickLang3(data.note, lang)}</p>
            </Card>

            {data.sources.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-400">판정 근거</p>
                <div className="mt-2 flex flex-col gap-2">
                  {data.sources.map((s) => (
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
    </div>
  );
}
