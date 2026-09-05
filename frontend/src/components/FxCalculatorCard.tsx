"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import { Card, ErrorNotice } from "@/components/Card";
import { Dropdown } from "@/components/Dropdown";
import type { FxRatesResponse, Lang } from "@/lib/types";

// EPS 17개국 중 동티모르(USD, 자체 통화 없음)를 제외한 16개 통화.
// 실제로 실시간 환율을 받아오는지 여부는 백엔드 unsupported 목록으로 판단하고,
// 여기서는 목록/라벨만 정의한다 - 숫자는 절대 여기서 만들지 않는다.
const FX_CURRENCIES: { code: string; ko: string; en: string; vi: string }[] = [
  { code: "VND", ko: "베트남 동", en: "Vietnamese Dong", vi: "Việt Nam Đồng" },
  { code: "PHP", ko: "필리핀 페소", en: "Philippine Peso", vi: "Peso Philippines" },
  { code: "THB", ko: "태국 바트", en: "Thai Baht", vi: "Baht Thái Lan" },
  { code: "IDR", ko: "인도네시아 루피아", en: "Indonesian Rupiah", vi: "Rupiah Indonesia" },
  { code: "BDT", ko: "방글라데시 타카", en: "Bangladeshi Taka", vi: "Taka Bangladesh" },
  { code: "PKR", ko: "파키스탄 루피", en: "Pakistani Rupee", vi: "Rupee Pakistan" },
  { code: "CNY", ko: "중국 위안", en: "Chinese Yuan", vi: "Nhân dân tệ Trung Quốc" },
  { code: "MNT", ko: "몽골 투그릭", en: "Mongolian Tugrik", vi: "Tugrik Mông Cổ" },
  { code: "KHR", ko: "캄보디아 리엘", en: "Cambodian Riel", vi: "Riel Campuchia" },
  { code: "LAK", ko: "라오스 킵", en: "Lao Kip", vi: "Kip Lào" },
  { code: "MMK", ko: "미얀마 짯", en: "Myanmar Kyat", vi: "Kyat Myanmar" },
  { code: "NPR", ko: "네팔 루피", en: "Nepalese Rupee", vi: "Rupee Nepal" },
  { code: "LKR", ko: "스리랑카 루피", en: "Sri Lankan Rupee", vi: "Rupee Sri Lanka" },
  { code: "KGS", ko: "키르기스스탄 솜", en: "Kyrgyzstani Som", vi: "Som Kyrgyzstan" },
  { code: "TJS", ko: "타지키스탄 소모니", en: "Tajikistani Somoni", vi: "Somoni Tajikistan" },
  { code: "UZS", ko: "우즈베키스탄 숨", en: "Uzbekistani Som", vi: "Som Uzbekistan" },
];

const NATIONALITY_TO_CURRENCY: Record<string, string> = {
  KH: "KHR", ID: "IDR", LA: "LAK", MM: "MMK", PH: "PHP", TH: "THB", TL: "USD",
  VN: "VND", BD: "BDT", NP: "NPR", PK: "PKR", LK: "LKR", KG: "KGS", TJ: "TJS",
  UZ: "UZS", CN: "CNY", MN: "MNT",
};

function currencyLabel(lang: Lang, code: string): string {
  const entry = FX_CURRENCIES.find((c) => c.code === code);
  return entry ? `${entry[lang] ?? entry.ko} (${code})` : code;
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function FxCalculatorCard() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;
  const defaultCurrency = NATIONALITY_TO_CURRENCY[state.profile.nationality] ?? "VND";

  const [currency, setCurrency] = useState(defaultCurrency === "USD" ? "VND" : defaultCurrency);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"KRW_TO_FX" | "FX_TO_KRW">("KRW_TO_FX");

  const { data, loading, error } = useFetch<FxRatesResponse>(() => api.fxRates(), []);

  const isTimor = state.profile.nationality === "TL";
  const rate = data?.rates.find((r) => r.currency === currency);
  const isUnsupported = data?.unsupported.includes(currency) ?? false;
  const amountNum = Number(amount);
  const hasAmount = amount !== "" && !Number.isNaN(amountNum);
  const converted =
    rate && hasAmount
      ? direction === "KRW_TO_FX"
        ? amountNum / rate.rate
        : amountNum * rate.rate
      : null;

  const source = data?.sources[0];

  return (
    <Card className="mt-3">
      <p className="font-bold text-brand-navy">{t(lang, "fxCalculatorTitle")}</p>

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
              onChange={(v) => setCurrency(v)}
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
                  {converted !== null ? formatNumber(converted) : "-"}
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
    </Card>
  );
}
