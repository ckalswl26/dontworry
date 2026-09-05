"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card, PrimaryButton } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import type { ExpenseBreakdown, PlannerResponse } from "@/lib/types";
import { formatKRW, formatKRWInput, parseKRW } from "@/lib/format";

type ExpenseKey = keyof ExpenseBreakdown;

const EXPENSE_KEYS: ExpenseKey[] = ["housing", "food", "communication", "transportation", "remittance", "other"];

const EXPENSE_LABELS: Record<ExpenseKey, string> = {
  housing: "주거비",
  food: "식비",
  communication: "통신비",
  transportation: "교통비",
  remittance: "본국송금",
  other: "기타",
};

function toNumber(value: string): number {
  return parseKRW(value);
}

export default function PlannerPage() {
  const router = useRouter();
  const { state, setPlanner } = useStore();
  const lang = state.profile.language;

  const [targetAmount, setTargetAmount] = useState("");
  const [monthsLeft, setMonthsLeft] = useState(String(state.planner.months_left || ""));
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [mealsHousingProvided, setMealsHousingProvided] = useState(state.planner.meals_housing_provided);
  const [expenses, setExpenses] = useState<Record<ExpenseKey, string>>({
    housing: "",
    food: "",
    communication: "",
    transportation: "",
    remittance: "",
    other: "",
  });
  // "모름"으로 표시된 항목 - 값을 추측해서 채우지 않고 계산에서 아예 제외한다.
  const [unknownExpenses, setUnknownExpenses] = useState<Set<ExpenseKey>>(new Set());

  const [result, setResult] = useState<PlannerResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleUnknown = (key: ExpenseKey) => {
    setUnknownExpenses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setExpenses((prev) => ({ ...prev, [key]: "" }));
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const expenseValues = EXPENSE_KEYS.reduce((acc, key) => {
        acc[key] = unknownExpenses.has(key) ? 0 : toNumber(expenses[key]);
        return acc;
      }, {} as ExpenseBreakdown);

      const body = {
        target_amount: toNumber(targetAmount),
        current_savings: state.planner.current_savings,
        months_left: toNumber(monthsLeft) || 1,
        monthly_income: toNumber(monthlyIncome),
        expenses: expenseValues,
        meals_housing_provided: mealsHousingProvided,
      };

      const res = await api.plannerCalculate(body);
      setResult(res);
      setPlanner(body);
    } finally {
      setLoading(false);
    }
  };

  const excludedLabels = EXPENSE_KEYS.filter((k) => unknownExpenses.has(k)).map((k) => EXPENSE_LABELS[k]);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "plannerTitle")} onBack={() => router.back()} />

      <div className="flex-1 px-5 pb-28 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">{t(lang, "targetAmount")}</label>
            <div className="relative"><input
              type="text"
              inputMode="numeric"
              value={targetAmount}
              onChange={(e) => setTargetAmount(formatKRWInput(e.target.value))}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm font-semibold shadow-sm focus:border-brand-blue"
            /><span className="pointer-events-none absolute bottom-3 right-3 text-xs font-bold text-slate-400">원</span></div>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t(lang, "monthsLeft")}</label>
            <input
              type="text" inputMode="numeric"
              value={monthsLeft}
              onChange={(e) => setMonthsLeft(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500">{t(lang, "monthlyIncome")}</label>
            <div className="relative"><input
              type="text" inputMode="numeric"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(formatKRWInput(e.target.value))}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm font-semibold shadow-sm focus:border-brand-blue"
            /><span className="pointer-events-none absolute bottom-3 right-3 text-xs font-bold text-slate-400">원</span></div>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mealsHousingProvided}
            onChange={(e) => setMealsHousingProvided(e.target.checked)}
          />
          {t(lang, "mealsHousing")}
        </label>

        <p className="mt-5 text-sm font-extrabold text-brand-navy">{t(lang, "expenses")}</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {EXPENSE_KEYS.map((key) => {
            const isUnknown = unknownExpenses.has(key);
            return (
              <div key={key}>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500">{EXPENSE_LABELS[key]}</label>
                  <button
                    type="button"
                    onClick={() => toggleUnknown(key)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      isUnknown ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200 text-gray-400"
                    }`}
                  >
                    {t(lang, "unknownExpense")}
                  </button>
                </div>
                <div className="relative"><input
                  type="text" inputMode="numeric"
                  value={expenses[key]}
                  onChange={(e) => setExpenses({ ...expenses, [key]: formatKRWInput(e.target.value) })}
                  placeholder="0"
                  disabled={isUnknown}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-9 text-sm font-semibold shadow-sm focus:border-brand-blue disabled:bg-gray-50 disabled:text-gray-300"
                /><span className="pointer-events-none absolute bottom-3 right-3 text-[11px] font-bold text-slate-400">원</span></div>
              </div>
            );
          })}
        </div>

        <button
          onClick={calculate}
          disabled={loading}
          className="mt-6 w-full rounded-xl2 bg-brand-blue py-3 font-semibold text-white disabled:opacity-40"
        >
          {loading ? "..." : t(lang, "recalculate")}
        </button>

        {result && (
          <Card className={`mt-5 ${result.goal_met ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <p className={`text-sm font-semibold ${result.goal_met ? "text-green-700" : "text-amber-700"}`}>
              {result.goal_met ? t(lang, "goalMet") : t(lang, "goalNotMet")}
            </p>
            <div className="mt-3 flex justify-between">
              <div>
                <p className="text-xs text-gray-500">{t(lang, "disposableIncome")}</p>
                <p className="text-base font-bold text-brand-navy">{formatKRW(result.disposable_income)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t(lang, "requiredSaving")}</p>
                <p className="text-base font-bold text-brand-navy">{formatKRW(result.required_monthly_saving)}</p>
              </div>
            </div>
            {!result.goal_met && (
              <p className="mt-2 text-xs text-amber-700">부족액: {formatKRW(result.shortfall_amount)}</p>
            )}
            {excludedLabels.length > 0 && (
              <p className="mt-3 rounded-lg bg-white/60 px-2.5 py-2 text-xs text-amber-700">
                ⚠ {excludedLabels.join(", ")} {t(lang, "excludedExpenseNote")}
              </p>
            )}
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
