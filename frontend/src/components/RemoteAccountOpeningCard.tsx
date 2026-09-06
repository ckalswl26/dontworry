"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { RemoteAccountOpening } from "@/lib/types";

const STATUS_BADGE: Record<RemoteAccountOpening["supported"], { label: string; className: string }> = {
  yes: { label: "지원됨", className: "bg-emerald-50 text-emerald-700" },
  pilot: { label: "곧 가능해질 수 있음", className: "bg-amber-50 text-amber-700" },
  unconfirmed: { label: "확인 필요", className: "bg-slate-100 text-slate-500" },
};

const ORDER: Record<RemoteAccountOpening["supported"], number> = { yes: 0, pilot: 1, unconfirmed: 2 };

export function RemoteAccountOpeningCard() {
  const router = useRouter();
  const { data, loading, error } = useFetch<RemoteAccountOpening[]>(() => api.remoteAccountOpening(), []);

  if (loading || error || !data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => ORDER[a.supported] - ORDER[b.supported]);

  return (
    <Card className="mt-3">
      <p className="font-bold text-brand-navy">📄 여권만으로 비대면 계좌개설, 되는 곳이 있을까요?</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        외국인등록증(ARC)이 나오기 전에는 대부분 은행에서 비대면 계좌개설이 안 되지만, 일부는 다른 방식으로 지원하고
        있어요.
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        {sorted.map((entry) => (
          <div key={entry.institution} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-brand-navy">{entry.institution}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[entry.supported].className}`}>
                {STATUS_BADGE[entry.supported].label}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">{entry.method_ko}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{entry.conditions_ko}</p>
            <a
              href={entry.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block text-[11px] text-brand-blue underline"
            >
              출처 · {entry.verified_at} 확인
            </a>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-amber-700">
        ⚠ 규제 샌드박스·시범사업 등 계속 바뀔 수 있는 정보예요. 확인된 시점 기준이니 실제 신청 전 반드시 해당 은행에
        다시 확인하세요.
      </p>

      <button
        type="button"
        onClick={() => router.push("/passport-prep")}
        className="mt-3 w-full rounded-xl border border-brand-blue py-2.5 text-center text-sm font-semibold text-brand-blue"
      >
        📝 계좌개설 준비하기
      </button>
    </Card>
  );
}
