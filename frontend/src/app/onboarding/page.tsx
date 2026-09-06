"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { PrimaryButton } from "@/components/Card";
import { Dropdown } from "@/components/Dropdown";
import { LogoWordmark, Mascot } from "@/components/Logo";
import { api } from "@/lib/api";
import { NATIONALITIES, VISA_TYPES, VISA_TYPE_LABELS, VISIT_TIMES } from "@/lib/profileOptions";
import { pickLang3 } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { state, setProfile, setOnboarded, loadDemo } = useStore();
  const lang = state.profile.language;
  const [profile, setLocalProfile] = useState(state.profile);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const toggleVisitTime = (code: string) => {
    const current = profile.available_visit_time;
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    setLocalProfile({ ...profile, available_visit_time: next });
  };

  const handleStart = () => {
    setProfile(profile);
    setOnboarded(true);
    router.push("/home");
  };

  const handleDemo = async () => {
    setLoadingDemo(true);
    try {
      const demo = await api.demoPersona();
      loadDemo(demo.profile, demo.planner, demo.documents_held);
      router.push("/home");
    } catch {
      alert("데모 데이터를 불러오지 못했어요. 백엔드 서버가 실행 중인지 확인해주세요.");
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-5 py-6">
      <div className="flex items-center justify-between rounded-xl2 bg-brand-sky px-4 py-3.5">
        <div className="min-w-0 pr-2">
          <LogoWordmark height={20} />
          <p className="mt-1 text-[10px] font-semibold text-slate-500">외국인 근로자를 위한 금융 서비스</p>
          <h1 className="mt-3 text-[17px] font-black leading-tight tracking-[-0.03em] text-brand-navy">맞춤 금융 안내를<br />시작해요</h1>
        </div>
        <Mascot size={64} className="h-16 w-16 shrink-0 object-contain" />
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-xl2 border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(17,28,78,0.06)]">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "nameLabel")}</label>
          <input
            type="text"
            value={profile.name ?? ""}
            onChange={(e) => setLocalProfile({ ...profile, name: e.target.value })}
            placeholder={t(lang, "namePlaceholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-blue"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "nationality")}</label>
          <Dropdown
            value={profile.nationality}
            onChange={(v) => setLocalProfile({ ...profile, nationality: v })}
            options={NATIONALITIES.map((n) => ({ value: n.code, label: pickLang3(n, lang) }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "visaType")}</label>
          <Dropdown
            value={profile.visa_type}
            onChange={(v) => setLocalProfile({ ...profile, visa_type: v })}
            options={VISA_TYPES.map((v) => ({ value: v, label: VISA_TYPE_LABELS[v] ?? v }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "departureDate")}</label>
          <input
            type="date"
            value={profile.departure_date ?? ""}
            onChange={(e) => setLocalProfile({ ...profile, departure_date: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-blue"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "npsEnrolled")}</label>
          <div className="flex gap-2">
            {[
              { v: true, label: lang === "ko" ? "가입" : lang === "vi" ? "Có" : "Enrolled" },
              { v: false, label: lang === "ko" ? "미가입" : lang === "vi" ? "Không" : "Not enrolled" },
            ].map((opt) => (
              <button
                key={String(opt.v)}
                onClick={() => setLocalProfile({ ...profile, nps_enrolled: opt.v })}
                className={`flex-1 rounded-full border py-1.5 text-xs ${
                  profile.nps_enrolled === opt.v ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "tenureMonths")}</label>
          <input
            type="number"
            min={0}
            value={profile.tenure_months ?? ""}
            onChange={(e) => setLocalProfile({ ...profile, tenure_months: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-blue"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "visitTime")}</label>
          <div className="grid grid-cols-3 gap-1.5">
            {VISIT_TIMES.map((vt) => (
              <button
                key={vt.code}
                onClick={() => toggleVisitTime(vt.code)}
                className={`whitespace-nowrap rounded-full border px-2 py-1.5 text-xs ${
                  profile.available_visit_time.includes(vt.code)
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {t(lang, vt.key)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <PrimaryButton onClick={handleStart}>{t(lang, "start")}</PrimaryButton>
        <button
          onClick={handleDemo}
          disabled={loadingDemo}
          className="w-full rounded-xl2 border border-brand-blue py-2.5 text-xs font-semibold text-brand-blue disabled:opacity-40"
        >
          {loadingDemo ? "..." : t(lang, "demoMode")}
        </button>
      </div>
    </div>
  );
}
