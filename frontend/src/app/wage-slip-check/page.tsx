"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader, Card, ErrorNotice } from "@/components/Card";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import { formatKRWInput, formatKRW, parseKRW } from "@/lib/format";
import type { MinWageInfo } from "@/lib/types";

function parseHours(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function WageSlipCheckPage() {
  const router = useRouter();

  const { data, loading, error } = useFetch<MinWageInfo>(() => api.minWage(), []);

  const [baseSalary, setBaseSalary] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [nightHours, setNightHours] = useState("");
  const [holidayHours, setHolidayHours] = useState("");
  const [netPay, setNetPay] = useState("");

  const baseSalaryNum = parseKRW(baseSalary);
  const overtimeHoursNum = parseHours(overtimeHours);
  const nightHoursNum = parseHours(nightHours);
  const holidayHoursNum = parseHours(holidayHours);
  const netPayNum = parseKRW(netPay);

  const hasInput = baseSalaryNum > 0;
  const hourlyWage = data && hasInput ? Math.round(baseSalaryNum / data.standard_monthly_hours) : null;

  const overtimePay = hourlyWage !== null ? Math.round(hourlyWage * 1.5 * overtimeHoursNum) : 0;
  const nightPay = hourlyWage !== null ? Math.round(hourlyWage * 0.5 * nightHoursNum) : 0;
  const holidayRegularHours = Math.min(holidayHoursNum, 8);
  const holidayExtraHours = Math.max(0, holidayHoursNum - 8);
  const holidayPay =
    hourlyWage !== null ? Math.round(hourlyWage * 1.5 * holidayRegularHours + hourlyWage * 2 * holidayExtraHours) : 0;

  const totalAllowance = overtimePay + nightPay + holidayPay;
  const expectedTotal = hourlyWage !== null ? baseSalaryNum + totalAllowance : null;

  const belowMinWage = data && hourlyWage !== null ? hourlyWage < data.hourly_wage : false;
  const hasNetPayInput = netPayNum > 0;
  const diff = expectedTotal !== null && hasNetPayInput ? netPayNum - expectedTotal : null;
  const hasMismatch = diff !== null && Math.abs(diff) >= 1000;

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="급여명세서 체크" onBack={() => router.back()} />
      <div className="flex-1 px-5 py-5">
        {loading && <p className="text-sm text-gray-400">...</p>}
        {!loading && error && <ErrorNotice message={error} />}
        {!loading && !error && data && (
          <>
            <Card className="border-amber-100 bg-amber-50/60">
              <p className="text-xs leading-5 text-amber-800">
                사진으로 자동 인식하지 않아요. 급여명세서를 보면서 아래 숫자를 직접 입력하면, 근로기준법 기준
                예상 수당을 계산해드려요.
              </p>
            </Card>

            <Card className="mt-3">
              <div>
                <label className="text-xs text-gray-500">기본급 (세전)</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(formatKRWInput(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm font-semibold shadow-sm focus:border-brand-blue"
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 text-xs font-bold text-slate-400">원</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-gray-500">연장근로(h)</label>
                  <input
                    type="number"
                    min="0"
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm shadow-sm focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">야간근로(h)</label>
                  <input
                    type="number"
                    min="0"
                    value={nightHours}
                    onChange={(e) => setNightHours(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm shadow-sm focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">휴일근로(h)</label>
                  <input
                    type="number"
                    min="0"
                    value={holidayHours}
                    onChange={(e) => setHolidayHours(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm shadow-sm focus:border-brand-blue"
                  />
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">야간근로는 22시~06시 사이 근로시간이에요. 연장·야간이 겹치면 각각 따로 더해요.</p>

              <div className="mt-3">
                <label className="text-xs text-gray-500">실수령액 (선택 - 비교하려면 입력)</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={netPay}
                    onChange={(e) => setNetPay(formatKRWInput(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm font-semibold shadow-sm focus:border-brand-blue"
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 text-xs font-bold text-slate-400">원</span>
                </div>
              </div>
            </Card>

            {hasInput && hourlyWage !== null && (
              <Card className={`mt-3 ${belowMinWage ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                <p className="text-xs text-gray-500">통상시급 (월 소정근로시간 {data.standard_monthly_hours}시간 기준)</p>
                <p className="mt-1 text-xl font-black text-brand-navy">{hourlyWage.toLocaleString()}원</p>
                {belowMinWage && (
                  <p className="mt-2 text-sm font-bold text-brand-red">
                    {data.year}년 최저시급({data.hourly_wage.toLocaleString()}원)보다 낮을 수 있어요
                  </p>
                )}
              </Card>
            )}

            {hasInput && hourlyWage !== null && (
              <Card className="mt-3">
                <p className="text-sm font-semibold text-gray-500">예상 수당 (근로기준법 배율 기준)</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">연장근로수당 (×1.5)</span>
                    <span className="font-semibold text-brand-navy">{formatKRW(overtimePay)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">야간근로수당 (×0.5 가산)</span>
                    <span className="font-semibold text-brand-navy">{formatKRW(nightPay)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">휴일근로수당 (8h까지 ×1.5, 초과 ×2)</span>
                    <span className="font-semibold text-brand-navy">{formatKRW(holidayPay)}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-semibold text-gray-500">예상 수당 합계</span>
                  <span className="text-base font-black text-brand-navy">{formatKRW(totalAllowance)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-500">기본급 + 예상 수당</span>
                  <span className="text-base font-black text-brand-blue">{formatKRW(expectedTotal ?? 0)}</span>
                </div>
              </Card>
            )}

            {hasInput && hourlyWage !== null && hasNetPayInput && (
              <Card className={`mt-3 ${hasMismatch ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                {hasMismatch ? (
                  <>
                    <p className="text-sm font-bold text-amber-700">확인이 필요한 항목이 있어요</p>
                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      입력하신 실수령액과 예상 금액 사이에 차액이 있어요. 정확히 무엇 때문인지는 이 계산만으로는
                      알 수 없으니, 공제 내역을 다시 확인하거나 회사에 문의해보세요.
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-emerald-700">입력하신 실수령액이 예상 금액과 비슷해요.</p>
                )}
              </Card>
            )}

            <Card className="mt-3 border-amber-100 bg-amber-50/60">
              <p className="text-xs leading-5 text-amber-800">
                이 계산은 참고용이며, 정확한 판단은 고용노동부 상담(1350) 또는 노무사 상담이 필요합니다.
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
