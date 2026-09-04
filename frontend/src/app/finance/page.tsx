"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card } from "@/components/Card";
import { api } from "@/lib/api";
import type { FinanceProduct } from "@/lib/types";

export default function FinancePage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;
  const [whitelist, setWhitelist] = useState<FinanceProduct[]>([]);
  const [savings, setSavings] = useState<FinanceProduct[]>([]);
  const [savingsError, setSavingsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.financeWhitelist(), api.financeSavings()])
      .then(([wl, sv]) => {
        setWhitelist(wl.products);
        setSavings(sv.products);
        setSavingsError(sv.error);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "relatedProducts")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        <p className="text-xs text-gray-400">{t(lang, "productDisclaimer")}</p>

        <p className="mt-5 text-sm font-semibold text-gray-500">외국인 전용 / 서민금융</p>
        <div className="mt-2 flex flex-col gap-3">
          {whitelist.map((p) => (
            <Card key={p.product_id}>
              <p className="font-semibold text-brand-navy">{p.product_name}</p>
              <p className="text-xs text-gray-500">
                {p.bank} · {p.product_type}
              </p>
              {(p.base_rate || p.max_rate) && (
                <p className="mt-1 text-sm text-brand-blue">
                  {p.base_rate}% ~ {p.max_rate}% ({p.rate_as_of} 기준)
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400">{p.disclaimer}</p>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-sm font-semibold text-gray-500">금융감독원 공시 적금 상품</p>
        {loading && <p className="mt-2 text-sm text-gray-400">...</p>}
        {savingsError && (
          <p className="mt-2 text-sm text-gray-400">
            지금은 실시간 상품 조회를 불러올 수 없어요. 잠시 후 다시 시도해주세요.
          </p>
        )}
        <div className="mt-2 flex flex-col gap-3">
          {savings.slice(0, 15).map((p) => (
            <Card key={p.product_id}>
              <p className="font-semibold text-brand-navy">{p.product_name}</p>
              <p className="text-xs text-gray-500">{p.bank}</p>
              {(p.base_rate || p.max_rate) && (
                <p className="mt-1 text-sm text-brand-blue">
                  {p.base_rate}% ~ {p.max_rate}%
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
