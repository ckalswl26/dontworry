"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import type { Lang } from "@/lib/types";

export default function MyPage() {
  const router = useRouter();
  const { state, setProfile, setLang, reset } = useStore();
  const lang = state.profile.language;

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "myTitle")} onBack={() => router.back()} />

      <div className="flex-1 px-5 pb-28 pt-6">
        <Card>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">{t(lang, "nameLabel")}</span>
            <input
              type="text"
              value={state.profile.name ?? ""}
              onChange={(e) => setProfile({ name: e.target.value })}
              placeholder={t(lang, "namePlaceholder")}
              className="rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">{t(lang, "nationality")}</span>
            <span className="font-semibold">{state.profile.nationality}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">{t(lang, "visaType")}</span>
            <span className="font-semibold">{state.profile.visa_type}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">{t(lang, "departureDate")}</span>
            <input
              type="date"
              value={state.profile.departure_date ?? ""}
              onChange={(e) => setProfile({ departure_date: e.target.value })}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
            />
          </div>
        </Card>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-600">{t(lang, "langSelect")}</label>
          <div className="flex gap-2">
            {(["ko", "en", "vi"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex-1 rounded-full border py-2 text-sm ${
                  lang === l ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.push("/consult-card")}
          className="mt-6 w-full rounded-xl2 border border-brand-blue py-3 text-sm font-semibold text-brand-blue"
        >
          {t(lang, "consultCard")}
        </button>

        <button
          onClick={() => {
            reset();
            router.push("/");
          }}
          className="mt-3 w-full rounded-xl2 border border-gray-200 py-3 text-sm text-gray-500"
        >
          {lang === "ko" ? "정보 초기화" : lang === "vi" ? "Đặt lại thông tin" : "Reset info"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
