"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, ErrorNotice } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { DDayResponse } from "@/lib/types";

export default function DDayPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;

  const { data, loading, error } = useFetch<DDayResponse | null>(
    () => (state.profile.departure_date ? api.dday(state.profile.departure_date) : Promise.resolve(null)),
    [state.profile.departure_date]
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "ddayTitle")} onBack={() => router.back()} />

      <div className="flex-1 px-5 pb-28 pt-6">
        {!state.profile.departure_date && (
          <p className="text-sm text-gray-400">출국 예정일을 먼저 입력해주세요 (내 정보에서 수정 가능).</p>
        )}

        {state.profile.departure_date && loading && <p className="text-sm text-gray-400">...</p>}
        {!loading && error && <ErrorNotice message={error} />}

        {data && (
          <>
            <div className="rounded-xl2 bg-brand-navy p-5 text-center text-white">
              <p className="text-xs text-white/70">{data.departure_date} 출국 예정</p>
              <p className="mt-1 text-4xl font-black">D-{data.days_left}</p>
            </div>

            <p className="mt-6 text-sm font-extrabold text-brand-navy">{t(lang, "todo")}</p>
            <div className="relative mt-3 flex flex-col gap-6 border-l border-gray-200 pl-6">
              {data.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => item.task_id && router.push(`/tasks/${item.task_id}`)}
                  className="relative text-left"
                >
                  <span className="absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
                    {item.day_offset === 0 ? "0" : item.day_offset}
                  </span>
                  <p className="font-semibold text-brand-navy">{item.label}</p>
                  <p className="text-xs text-gray-500">
                    {item.detail}
                    {item.is_recommended_not_legal && " (팀 권장 시점, 법정기한 아님)"}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
