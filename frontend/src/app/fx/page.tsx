"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card, ErrorNotice } from "@/components/Card";
import { FxConverter } from "@/components/FxConverter";
import { FxLineChart } from "@/components/FxLineChart";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import { FX_CURRENCIES, currencyLabel, defaultCurrencyForNationality } from "@/lib/fxCurrencies";
import type { FxHistoryResponse } from "@/lib/types";

const RANGES: { key: string; labelKey: string }[] = [
  { key: "1m", labelKey: "fxRange1m" },
  { key: "3m", labelKey: "fxRange3m" },
  { key: "1y", labelKey: "fxRange1y" },
  { key: "5y", labelKey: "fxRange5y" },
  { key: "max", labelKey: "fxRangeMax" },
];

export default function FxPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;

  const [currency, setCurrency] = useState(defaultCurrencyForNationality(state.profile.nationality));
  const [range, setRange] = useState("1m");

  // 홈 화면 카드에서 ?currency=로 넘어온 경우 그 통화를 이어서 보여준다.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("currency");
    if (code && FX_CURRENCIES.some((c) => c.code === code)) setCurrency(code);
  }, []);

  const { data, loading, error } = useFetch<FxHistoryResponse>(() => api.fxHistory(currency, range), [currency, range]);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "fxCalculatorTitle")} onBack={() => router.back()} />
      <div className="flex-1 px-5 py-5 pb-10">
        <Card>
          <FxConverter lang={lang} currency={currency} onCurrencyChange={setCurrency} nationality={state.profile.nationality} />
        </Card>

        <Card className="mt-4">
          <p className="font-bold text-brand-navy">
            {t(lang, "fxHistoryTitle")} · {currencyLabel(lang, currency)}
          </p>
          <div className="mt-3 grid grid-cols-5 gap-1 rounded-xl bg-slate-50 p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-lg py-1.5 text-[11px] font-bold ${
                  range === r.key ? "bg-brand-navy text-white" : "text-slate-500"
                }`}
              >
                {t(lang, r.labelKey)}
              </button>
            ))}
          </div>

          {loading && <p className="mt-4 text-sm text-gray-400">...</p>}
          {!loading && error && (
            <div className="mt-4">
              <ErrorNotice message={error} />
            </div>
          )}
          {!loading && !error && data && !data.available && (
            <p className="mt-4 text-sm text-brand-red">{data.error || t(lang, "fxUnavailableMessage")}</p>
          )}
          {!loading && !error && data && data.available && (
            <div className="mt-4">
              <FxLineChart points={data.points} />
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-400">{t(lang, "fxHistoryNote")}</p>
        </Card>
      </div>
    </div>
  );
}
