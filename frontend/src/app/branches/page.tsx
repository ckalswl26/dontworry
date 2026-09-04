"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card, ErrorNotice } from "@/components/Card";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { MultilingualBranch } from "@/lib/types";

export default function BranchesPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;

  const { data, loading, error } = useFetch<{ branches: MultilingualBranch[] }>(
    () => api.multilingualBranches(),
    []
  );

  const branches = data?.branches ?? [];
  const byBank = branches.reduce<Record<string, MultilingualBranch[]>>((acc, b) => {
    (acc[b.bank] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "multilingualBranchesTitle")} onBack={() => router.back()} />

      <div className="flex-1 px-5 pb-10 pt-5">
        <p className="text-xs text-gray-400">{t(lang, "multilingualBranchesDisclaimer")}</p>

        {loading && <p className="mt-3 text-sm text-gray-400">...</p>}
        {!loading && error && <ErrorNotice message={error} />}

        {Object.entries(byBank).map(([bank, list]) => (
          <div key={bank} className="mt-5">
            <p className="text-sm font-extrabold text-brand-navy">{bank}</p>
            <div className="mt-2 flex flex-col gap-3">
              {list.map((b) => (
                <Card key={b.branch_id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-brand-navy">{b.branch_name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        b.authority_grade === "A" ? "bg-blue-50 text-brand-blue" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {b.authority_grade === "A" ? t(lang, "officialSourceBadge") : t(lang, "newsSourceBadge")}
                    </span>
                  </div>
                  {b.address && <p className="mt-1 text-sm text-gray-600">📍 {b.address}</p>}
                  {b.phone && (
                    <a href={`tel:${b.phone}`} className="mt-1 block text-sm text-brand-blue">
                      📞 {b.phone}
                    </a>
                  )}
                  {b.languages.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1">
                      {b.languages.map((l) => (
                        <span key={l} className="rounded-full bg-brand-sky px-2 py-0.5 text-[11px] text-brand-navy">
                          {l}
                        </span>
                      ))}
                    </p>
                  )}
                  {b.note && <p className="mt-2 text-xs text-gray-400">{b.note}</p>}
                  <button
                    onClick={() => router.push(`/sources/${b.source_id}`)}
                    className="mt-3 text-xs text-gray-400 underline"
                  >
                    {t(lang, "sourceDetail")} · {b.last_verified_at}
                  </button>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
