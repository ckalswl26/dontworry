"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { BackHeader, Card, ErrorNotice } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { DDayResponse, PensionResult, RuleEvaluateResponse } from "@/lib/types";

type ItemStatus = "eligible" | "not_eligible" | "unknown";

interface SettlementItem {
  id: string;
  title: string;
  status: ItemStatus;
  org: string;
  deadlineLabel: string;
  deadlineText: string;
  amountText: string;
  reason?: string;
  route: string;
}

const STATUS_LABEL: Record<ItemStatus, string> = { eligible: "있음", not_eligible: "없음", unknown: "확인 필요" };
const STATUS_STYLE: Record<ItemStatus, string> = {
  eligible: "bg-emerald-100 text-emerald-700",
  not_eligible: "bg-gray-100 text-gray-500",
  unknown: "bg-amber-100 text-amber-700",
};

// 반환일시금 판정 코드 중 "확정 불가 - 추가 확인 필요"에 해당하는 코드만 unknown으로 본다.
// 그 외 eligible=false는 규칙상 명확히 대상이 아닌 것이므로 "없음"으로 표시한다.
const PENSION_ADDITIONAL_REVIEW_CODES = new Set([
  "ADDITIONAL_REVIEW_REQUIRED",
  "RECIPROCITY_MIN_MONTHS_NOT_MET",
  "E8_SUBTYPE_UNSPECIFIED",
]);

function taskItemStatus(signal: string | undefined): ItemStatus {
  if (!signal) return "unknown";
  if (signal === "N/A") return "not_eligible";
  return "eligible";
}

function pensionItemStatus(p: PensionResult | null | undefined): ItemStatus {
  if (!p) return "unknown";
  if (p.eligible) return "eligible";
  if (PENSION_ADDITIONAL_REVIEW_CODES.has(p.reason_code)) return "unknown";
  return "not_eligible";
}

export default function SettlementChecklistPage() {
  const router = useRouter();
  const { state, setSettlementItemDone } = useStore();

  const { data: ruleData, loading: ruleLoading, error: ruleError } = useFetch<RuleEvaluateResponse>(
    () => api.rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld }),
    []
  );

  const hasNpsInfo = state.profile.nps_enrolled !== null && state.profile.nps_enrolled !== undefined;
  const { data: pensionData } = useFetch<PensionResult | null>(
    () =>
      hasNpsInfo
        ? api.pensionEvaluate({
            nationality: state.profile.nationality,
            visa_type: state.profile.visa_type,
            nps_enrolled: Boolean(state.profile.nps_enrolled),
            nps_insured_months: state.profile.nps_insured_months,
            departure_date: state.profile.departure_date,
            departure_confirmed: false,
          })
        : Promise.resolve(null),
    [
      hasNpsInfo,
      state.profile.nationality,
      state.profile.visa_type,
      state.profile.nps_enrolled,
      state.profile.nps_insured_months,
      state.profile.departure_date,
    ]
  );

  const { data: ddayData } = useFetch<DDayResponse | null>(
    () => (state.profile.departure_date ? api.dday(state.profile.departure_date) : Promise.resolve(null)),
    [state.profile.departure_date]
  );

  function recommendedDateFor(taskId: string): string | null {
    const item = ddayData?.items.find((i) => i.task_id === taskId);
    if (!item || !state.profile.departure_date) return null;
    const d = new Date(`${state.profile.departure_date}T00:00:00`);
    d.setDate(d.getDate() + item.day_offset);
    return d.toISOString().slice(0, 10);
  }

  const maturityTask = ruleData?.tasks.find((t) => t.task_id === "maturity_insurance");
  const returnCostTask = ruleData?.tasks.find((t) => t.task_id === "return_cost_insurance");
  const savingsSet = Boolean(state.savingsTracking.maturityDate);

  const maturityDate = recommendedDateFor("maturity_insurance");
  const returnCostDate = recommendedDateFor("return_cost_insurance");

  const items: SettlementItem[] = [
    {
      id: "last_wage",
      title: "마지막 급여",
      status: "unknown",
      org: "확인 필요",
      deadlineLabel: "신청 기한",
      deadlineText: "확인 필요",
      amountText: "확인 필요",
      reason: "정확한 금액은 급여명세서 체크에서 확인해보세요.",
      route: "/wage-slip-check",
    },
    {
      id: "maturity_insurance",
      title: "출국만기보험",
      status: taskItemStatus(maturityTask?.signal),
      org: maturityTask?.responsible_org ?? "확인 필요",
      deadlineLabel: "권장 신청 시점 (법정기한 아님)",
      deadlineText: maturityDate ?? maturityTask?.reason ?? "확인 필요",
      amountText: "확인 필요",
      reason: maturityTask?.reason,
      route: "/tasks/maturity_insurance",
    },
    {
      id: "return_cost_insurance",
      title: "귀국비용보험",
      status: taskItemStatus(returnCostTask?.signal),
      org: returnCostTask?.responsible_org ?? "확인 필요",
      deadlineLabel: "권장 신청 시점 (법정기한 아님)",
      deadlineText: returnCostDate ?? returnCostTask?.reason ?? "확인 필요",
      amountText: "확인 필요",
      reason: returnCostTask?.reason,
      route: "/tasks/return_cost_insurance",
    },
    {
      id: "pension_refund",
      title: "국민연금 반환일시금",
      status: pensionItemStatus(pensionData),
      org: "국민연금공단",
      deadlineLabel: "신청 가능 시점",
      deadlineText: pensionData?.next_action ?? "확인 필요",
      amountText: "확인 필요",
      reason: pensionData?.reason,
      route: "/tasks/pension_refund",
    },
    {
      id: "savings_maturity",
      title: "가입한 예적금 만기",
      status: savingsSet ? "eligible" : "unknown",
      org: savingsSet ? state.savingsTracking.productName || "가입한 금융기관" : "확인 필요",
      deadlineLabel: "만기일",
      deadlineText: savingsSet ? (state.savingsTracking.maturityDate as string) : "등록된 적금이 없어요",
      amountText: "확인 필요",
      reason: savingsSet ? undefined : "체류기간 맞춤 예적금 플래너에서 만기일을 저장해보세요.",
      route: "/finance",
    },
  ];

  const applicable = items.filter((i) => i.status !== "not_eligible");
  const doneCount = applicable.filter((i) => state.settlementProgress[i.id]).length;

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-28 pt-5">
      <BackHeader title="귀국 전 정산 체크리스트" onBack={() => router.back()} />

      <Card className="mt-4 border-brand-blue/15 bg-brand-sky/40">
        <p className="text-xs text-slate-500">지금까지 신청 완료</p>
        <p className="mt-1 text-2xl font-black text-brand-navy">
          {doneCount} / {applicable.length}건
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-brand-blue"
            style={{ width: `${applicable.length ? Math.round((doneCount / applicable.length) * 100) : 0}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-500">
          여기 표시된 금액은 실제 계좌·보험 잔액을 조회해서 계산한 게 아니에요. 자격 여부와 신청 방법만
          정리해드리니, 정확한 금액은 각 기관에서 직접 확인해주세요.
        </p>
      </Card>

      {ruleLoading && <p className="mt-4 text-sm text-gray-400">확인하고 있어요...</p>}
      {!ruleLoading && ruleError && <div className="mt-4"><ErrorNotice message={ruleError} /></div>}

      <div className="mt-3 flex flex-col gap-3">
        {items.map((item) => (
          <Card key={item.id} className="!p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-bold text-brand-navy">{item.title}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[item.status]}`}>
                {STATUS_LABEL[item.status]}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-xs text-slate-500">
              <p>신청 기관: {item.org}</p>
              <p>
                {item.deadlineLabel}: {item.deadlineText}
              </p>
              <p>예상 금액: {item.amountText}</p>
              {item.reason && <p className="text-slate-400">{item.reason}</p>}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => router.push(item.route)} className="text-xs font-semibold text-brand-blue">
                자세히 보기 ›
              </button>
              {item.status !== "not_eligible" && (
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <input
                    type="checkbox"
                    checked={Boolean(state.settlementProgress[item.id])}
                    onChange={(e) => setSettlementItemDone(item.id, e.target.checked)}
                    className="h-4 w-4 accent-brand-navy"
                  />
                  신청 완료
                </label>
              )}
            </div>
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
