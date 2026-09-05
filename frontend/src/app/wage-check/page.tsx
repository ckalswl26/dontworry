"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { BackHeader, Card, ErrorNotice } from "@/components/Card";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import { formatKRWInput, parseKRW } from "@/lib/format";
import type { MinWageInfo } from "@/lib/types";

export default function WageCheckPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;

  const { data, loading, error } = useFetch<MinWageInfo>(() => api.minWage(), []);

  const [monthlyWage, setMonthlyWage] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("40");

  const monthlyWageNum = parseKRW(monthlyWage);
  const weeklyHoursNum = Number(weeklyHours) || 0;
  const monthlyHours =
    !data
      ? 0
      : weeklyHoursNum === 40
      ? data.standard_monthly_hours
      : Math.round((weeklyHoursNum + 8) * 4.345);
  const hourlyEquivalent = monthlyHours > 0 ? Math.round(monthlyWageNum / monthlyHours) : null;
  const hasInput = monthlyWageNum > 0 && weeklyHoursNum > 0;
  const belowMinWage = data && hourlyEquivalent !== null ? hourlyEquivalent < data.hourly_wage : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="최저임금 확인하기" onBack={() => router.back()} />
      <div className="flex-1 px-5 py-5">
        {loading && <p className="text-sm text-gray-400">...</p>}
        {!loading && error && <ErrorNotice message={error} />}
        {!loading && !error && data && (
          <>
            <Card>
              <p className="text-xs text-gray-500">{data.year}년 최저시급</p>
              <p className="mt-1 text-2xl font-black text-brand-navy">{data.hourly_wage.toLocaleString()}원</p>
            </Card>

            <Card className="mt-3">
              <div>
                <label className="text-xs text-gray-500">월급 (세전 기본급 기준)</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monthlyWage}
                    onChange={(e) => setMonthlyWage(formatKRWInput(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm font-semibold shadow-sm focus:border-brand-blue"
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 text-xs font-bold text-slate-400">원</span>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-500">주당 근무시간 (연장근무 제외)</label>
                <input
                  type="number"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(e.target.value)}
                  placeholder="40"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm focus:border-brand-blue"
                />
              </div>
            </Card>

            {hasInput && hourlyEquivalent !== null && (
              <Card className={`mt-3 ${belowMinWage ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                <p className="text-xs text-gray-500">환산 시급 (월 소정근로시간 {monthlyHours}시간 기준)</p>
                <p className="mt-1 text-xl font-black text-brand-navy">{hourlyEquivalent.toLocaleString()}원</p>
                <p className={`mt-2 text-sm font-bold ${belowMinWage ? "text-brand-red" : "text-emerald-700"}`}>
                  {belowMinWage ? "최저임금보다 낮을 수 있어요" : "최저임금 이상이에요"}
                </p>
              </Card>
            )}

            <Card className="mt-3 border-amber-100 bg-amber-50/60">
              <p className="text-xs leading-5 text-amber-800">
                이 계산은 기본급 기준 단순 참고용이며(연장·야간·휴일수당 등은 포함되지 않음), 실제 최저임금 위반 여부는 고용노동부 공식 계산기나 상담을 통해 확인해야 합니다.
              </p>
              <a
                href={data.calculator_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-bold text-brand-blue underline"
              >
                고용노동부 최저임금 모의계산기 열기 →
              </a>
            </Card>

            <button
              type="button"
              onClick={() => router.push("/guides/wage_claim")}
              className="mt-4 flex w-full items-center justify-between rounded-xl2 border border-brand-blue/20 bg-brand-sky px-5 py-4 text-left text-sm font-bold text-brand-navy shadow-sm"
            >
              <span>💬 임금을 못 받았다면? 신고 방법 보기</span>
              <span className="text-brand-blue">›</span>
            </button>

            {data.sources.length > 0 && (
              <p className="mt-4 text-[11px] text-gray-400">
                자료: {data.sources.map((s) => s.organization).join(", ")} ({data.sources[0]?.last_verified_at} 확인)
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
