"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import { ErrorNotice } from "@/components/Card";
import { Dropdown } from "@/components/Dropdown";
import { FX_CURRENCIES, currencyLabel, formatFxNumber } from "@/lib/fxCurrencies";
import type { FxRatesResponse, Lang } from "@/lib/types";

export function FxConverter({
  lang,
  currency,
  onCurrencyChange,
  nationality,
}: {
  lang: Lang;
  currency: string;
  onCurrencyChange: (code: string) => void;
  nationality?: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"KRW_TO_FX" | "FX_TO_KRW">("KRW_TO_FX");

  const { data, loading, error } = useFetch<FxRatesResponse>(() => api.fxRates(), []);

  const isTimor = nationality === "TL";
  const rate = data?.rates.find((r) => r.currency === currency);
  const isUnsupported = data?.unsupported.includes(currency) ?? false;
  const amountNum = Number(amount);
  const hasAmount = amount !== "" && !Number.isNaN(amountNum);
  const converted =
    rate && hasAmount ? (direction === "KRW_TO_FX" ? amountNum / rate.rate : amountNum * rate.rate) : null;

  const source = data?.sources[0];

  return (
    <>
      {loading && <p className="mt-3 text-sm text-gray-400">...</p>}
      {!loading && error && (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="mt-3">
            <Dropdown
              value={currency}
              onChange={onCurrencyChange}
              options={FX_CURRENCIES.map((c) => ({ value: c.code, label: currencyLabel(lang, c.code) }))}
              placeholder={t(lang, "fxSelectCurrency")}
            />
          </div>

          {isTimor && <p className="mt-2 text-xs text-gray-400">{t(lang, "fxTimorNote")}</p>}

          {!data.available && (
            <p className="mt-3 text-sm text-brand-red">{data.error || t(lang, "fxUnavailableMessage")}</p>
          )}

          {data.available && isUnsupported && (
            <p className="mt-3 text-sm text-gray-500">{t(lang, "fxUnsupportedMessage")}</p>
          )}

          {data.available && !isUnsupported && rate && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">
                    {direction === "KRW_TO_FX" ? t(lang, "fxAmountKrw") : currencyLabel(lang, currency)}
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue"
                  />
                </div>
                <button
                  type="button"
                  aria-label={t(lang, "fxSwap")}
                  onClick={() => setDirection((d) => (d === "KRW_TO_FX" ? "FX_TO_KRW" : "KRW_TO_FX"))}
                  className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-sky text-brand-navy"
                >
                  ⇅
                </button>
              </div>

              <div className="mt-3 rounded-xl bg-brand-gray px-3.5 py-3">
                <p className="text-xs text-gray-500">
                  {direction === "KRW_TO_FX" ? currencyLabel(lang, currency) : t(lang, "fxAmountKrw")}
                </p>
                <p className="mt-0.5 text-lg font-black text-brand-navy">
                  {converted !== null ? formatFxNumber(converted) : "-"}
                </p>
              </div>

              <p className="mt-2 text-[11px] text-gray-400">
                {rate.as_of} {t(lang, "fxAsOf")}
                {source && (
                  <>
                    {" · "}
                    {t(lang, "fxSourceLabel")}:{" "}
                    <button onClick={() => router.push(`/sources/${source.source_id}`)} className="underline">
                      {source.organization}
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}
