"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card, PrimaryButton } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { api } from "@/lib/api";
import type { ExpenseBreakdown, PlannerResponse } from "@/lib/types";

const EXPENSE_KEYS: (keyof ExpenseBreakdown)[] = ["housing", "food", "communication", "transportation", "remittance", "other"];

const EXPENSE_LABELS: Record<string, string> = {
  housing: "주거비",
  food: "식비",
  communication: "통신비",
  transportation: "교통비",
  remittance: "본국송금",
  other: "기타",
};

export default function PlannerPage() {
  const router = useRouter();
  const { state, setPlanner } = useStore();
  const lang = state.profile.language;
  const [form, setForm] = useState(state.planner);
  const [result, setResult] = useState<PlannerResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const updateExpense = (key: keyof ExpenseBreakdown, value: number) => {
    setForm({ ...form, expenses: { ...form.expenses, [key]: value } });
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await api.plannerCalculate(form);
      setResult(res);
      setPlanner(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "plannerTitle")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">{t(lang, "targetAmount")}</label>
            <input
              type="number"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{t(lang, "monthsLeft")}</label>
            <input
              type="number"
              value={form.months_left}
              onChange={(e) => setForm({ ...form, months_left: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500">{t(lang, "monthlyIncome")}</label>
            <input
              type="number"
              value={form.monthly_income}
              onChange={(e) => setForm({ ...form, monthly_income: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.meals_housing_provided}
            onChange={(e) => setForm({ ...form, meals_housing_provided: e.target.checked })}
          />
          {t(lang, "mealsHousing")}
        </label>

        <p className="mt-5 text-sm font-semibold text-gray-500">{t(lang, "expenses")}</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {EXPENSE_KEYS.map((key) => (
            <div key={key}>
              <label className="text-xs text-gray-500">{EXPENSE_LABELS[key]}</label>
              <input
                type="number"
                value={form.expenses[key]}
                onChange={(e) => updateExpense(key, Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          ))}
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
                <p className="text-lg font-bold text-brand-navy">{result.disposable_income.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t(lang, "requiredSaving")}</p>
                <p className="text-lg font-bold text-brand-navy">{result.required_monthly_saving.toLocaleString()}원</p>
              </div>
            </div>
            {!result.goal_met && (
              <p className="mt-2 text-xs text-amber-700">부족액: {result.shortfall_amount.toLocaleString()}원</p>
            )}
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
