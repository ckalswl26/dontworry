"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Card } from "@/components/Card";
import { FxConverter } from "@/components/FxConverter";
import { defaultCurrencyForNationality } from "@/lib/fxCurrencies";

export function FxCalculatorCard() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;

  const [currency, setCurrency] = useState(defaultCurrencyForNationality(state.profile.nationality));

  return (
    <Card className="mt-3">
      <p className="font-bold text-brand-navy">{t(lang, "fxCalculatorTitle")}</p>

      <FxConverter lang={lang} currency={currency} onCurrencyChange={setCurrency} nationality={state.profile.nationality} />

      <button
        type="button"
        onClick={() => router.push(`/fx?currency=${currency}`)}
        className="mt-3 w-full rounded-xl border border-brand-blue py-2.5 text-center text-sm font-semibold text-brand-blue"
      >
        {t(lang, "fxViewChart")}
      </button>
    </Card>
  );
}
