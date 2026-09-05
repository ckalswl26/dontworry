"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, ErrorNotice } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { DDayCalendar } from "@/components/DDayCalendar";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { DDayItem, DDayResponse } from "@/lib/types";

export default function DDayPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;
  const [selectedDate, setSelectedDate] = useState<{ key: string; items: DDayItem[] } | null>(null);

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

            <div className="mt-4">
              <DDayCalendar
                departureDate={data.departure_date}
                items={data.items}
                onSelectDate={(key, itemsOnDate) => setSelectedDate({ key, items: itemsOnDate })}
              />
            </div>

            {selectedDate && (
              <div className="mt-3 rounded-xl2 bg-brand-sky/40 p-4">
                <p className="text-xs font-semibold text-brand-navy">{selectedDate.key}</p>
                {selectedDate.items.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">이 날짜엔 예정된 할 일이 없어요.</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    {selectedDate.items.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => item.task_id && router.push(`/tasks/${item.task_id}`)}
                        className="text-left text-sm font-bold text-brand-navy"
                      >
                        {item.requires_visit && "📍 "}
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="mt-6 text-sm font-extrabold text-brand-navy">{t(lang, "todo")}</p>
            <div className="relative mt-3 flex flex-col gap-4 border-l border-gray-200 pl-5">
              {data.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => item.task_id && router.push(`/tasks/${item.task_id}`)}
                  className="relative text-left"
                >
                  <span
                    className={`absolute -left-[25px] top-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${
                      item.requires_visit ? "bg-brand-red" : "bg-brand-blue"
                    }`}
                  >
                    {item.day_offset === 0 ? "0" : item.day_offset}
                  </span>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-bold leading-5 text-brand-navy">{item.label}</p>
                    {item.requires_visit && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-red-50 px-2 py-1 text-[9px] font-semibold text-brand-red">
                        📍 {t(lang, "signalRed")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-gray-500">
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
