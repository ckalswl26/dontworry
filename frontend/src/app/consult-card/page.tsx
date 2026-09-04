"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card } from "@/components/Card";
import { api } from "@/lib/api";
import type { RuleEvaluateResponse } from "@/lib/types";

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default function ConsultCardPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;
  const [data, setData] = useState<RuleEvaluateResponse | null>(null);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    api.rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld }).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = daysUntil(state.profile.departure_date);
  const visitTask = data?.tasks.find((tsk) => tsk.signal === "RED");
  const missingDocs = visitTask?.required_documents.filter((d) => !state.documentsHeld.includes(d)) ?? [];
  const totalDocs = data?.tasks.reduce((sum, tsk) => sum + tsk.required_documents.length, 0) ?? 0;
  const heldDocs =
    data?.tasks.reduce((sum, tsk) => sum + tsk.required_documents.filter((d) => state.documentsHeld.includes(d)).length, 0) ?? 0;
  const readiness = totalDocs ? Math.round((heldDocs / totalDocs) * 100) : 100;

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "consultCard")} onBack={() => router.back()} />
      <p className="px-5 pt-2 text-right text-xs text-gray-400">상담사 전용</p>

      <div className="flex-1 px-5 py-5">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy text-white font-bold">
              {state.profile.nationality.slice(0, 1)}
            </div>
            <div>
              <p className="font-bold text-brand-navy">{state.profile.nationality} · {state.profile.visa_type}</p>
              <p className="text-xs text-gray-500">
                출국 D-{days ?? "?"} · {state.profile.available_visit_time.join(", ") || "-"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t(lang, "visitPurpose")}</span>
            <span className="font-semibold text-brand-red">{visitTask?.label ?? "-"}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">{t(lang, "readiness")}</span>
            <span className="font-bold">
              {readiness}% ({totalDocs - heldDocs}{t(lang, "missingCount")})
            </span>
          </div>
        </Card>

        {missingDocs.length > 0 && (
          <Card className="mt-3">
            <p className="text-sm font-semibold text-gray-500">{t(lang, "insufficientDocs")}</p>
            <ul className="mt-2 list-disc pl-4 text-sm text-brand-red">
              {missingDocs.map((d) => (
                <li key={d}>{d.replaceAll("_", " ")}</li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="mt-3">
          <p className="text-xs font-semibold text-gray-400">{t(lang, "judgementBasis")}</p>
          <p className="mt-1 text-xs text-gray-500">
            {visitTask?.sources.map((s) => s.title).join(", ") || "규칙 엔진 기본 판정"}
          </p>
        </Card>

        <div className="mt-4">
          <label className="text-sm font-semibold text-gray-500">{t(lang, "consultMemo")}</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="상담 중 특이사항을 메모하세요 (이 기기에만 임시 저장됩니다)"
            className="mt-2 h-28 w-full rounded-xl border border-gray-200 p-3 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
