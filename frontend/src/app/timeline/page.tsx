"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, PrimaryButton } from "@/components/Card";
import { api } from "@/lib/api";
import type { DeparturePlanResponse } from "@/lib/types";

const PRIORITY_LABEL_KEY: Record<string, string> = {
  REQUIRED: "required",
  RECOMMENDED: "recommended",
  INFO: "recommended",
};

const PRIORITY_STYLE: Record<string, string> = {
  REQUIRED: "bg-red-100 text-brand-red",
  RECOMMENDED: "bg-amber-100 text-amber-700",
  INFO: "bg-gray-100 text-gray-500",
};

export default function TimelinePage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;
  const [data, setData] = useState<DeparturePlanResponse | null>(null);

  useEffect(() => {
    api.departurePlan({ profile: state.profile }).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "order")} onBack={() => router.back()} />
      <p className="px-5 pt-4 text-sm text-gray-500">{t(lang, "orderDesc")}</p>

      <div className="flex-1 px-5 py-6">
        <div className="relative flex flex-col gap-6 border-l border-gray-200 pl-6">
          {data?.ordered_steps.map((step) => (
            <button
              key={step.task_id}
              onClick={() => router.push(`/tasks/${step.task_id}`)}
              className="relative text-left"
            >
              <span className="absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                {step.step}
              </span>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[step.priority]}`}
              >
                {t(lang, PRIORITY_LABEL_KEY[step.priority])}
              </span>
              <p className="mt-1 font-semibold text-brand-navy">{step.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-8">
        <PrimaryButton onClick={() => router.push(`/tasks/${data?.ordered_steps[0]?.task_id ?? ""}`)} disabled={!data}>
          {t(lang, "viewChecklist")}
        </PrimaryButton>
      </div>
    </div>
  );
}
