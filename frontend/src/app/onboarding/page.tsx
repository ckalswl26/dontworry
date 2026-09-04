"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { PrimaryButton } from "@/components/Card";
import { LogoWordmark, Mascot } from "@/components/Logo";
import { api } from "@/lib/api";

// 고용허가제(EPS) 협약 16개국 + 협약 논의 대상국 포함 17개국 (2026-01 기준)
const NATIONALITIES = [
  { code: "KH", ko: "캄보디아", en: "Cambodia", vi: "Campuchia" },
  { code: "ID", ko: "인도네시아", en: "Indonesia", vi: "Indonesia" },
  { code: "LA", ko: "라오스", en: "Laos", vi: "Lào" },
  { code: "MM", ko: "미얀마", en: "Myanmar", vi: "Myanmar" },
  { code: "PH", ko: "필리핀", en: "Philippines", vi: "Philippines" },
  { code: "TH", ko: "태국", en: "Thailand", vi: "Thái Lan" },
  { code: "TL", ko: "동티모르", en: "Timor-Leste", vi: "Đông Timor" },
  { code: "VN", ko: "베트남", en: "Vietnam", vi: "Việt Nam" },
  { code: "BD", ko: "방글라데시", en: "Bangladesh", vi: "Bangladesh" },
  { code: "NP", ko: "네팔", en: "Nepal", vi: "Nepal" },
  { code: "PK", ko: "파키스탄", en: "Pakistan", vi: "Pakistan" },
  { code: "LK", ko: "스리랑카", en: "Sri Lanka", vi: "Sri Lanka" },
  { code: "KG", ko: "키르기스스탄", en: "Kyrgyzstan", vi: "Kyrgyzstan" },
  { code: "TJ", ko: "타지키스탄", en: "Tajikistan", vi: "Tajikistan" },
  { code: "UZ", ko: "우즈베키스탄", en: "Uzbekistan", vi: "Uzbekistan" },
  { code: "CN", ko: "중국", en: "China", vi: "Trung Quốc" },
  { code: "MN", ko: "몽골", en: "Mongolia", vi: "Mông Cổ" },
];

const VISA_TYPES = ["E-9", "H-2", "E-8_LEGACY_TRAINING_EMPLOYMENT", "E-8_SEASONAL_WORK"];

const VISIT_TIMES = [
  { code: "weekday_daytime", key: "weekday" },
  { code: "saturday", key: "saturday" },
  { code: "sunday_only", key: "sundayOnly" },
];

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
    <div className="flex min-h-dvh flex-col px-6 py-8">
      <div className="flex items-center justify-between rounded-xl2 bg-brand-sky px-5 py-4">
        <div><LogoWordmark height={32} /><h1 className="mt-3 text-2xl font-black text-brand-navy">{t(lang, "onboardingTitle")}</h1><p className="mt-1 text-sm text-slate-500">{t(lang, "onboardingDesc")}</p></div>
        <Mascot size={96} className="h-24 w-24 object-contain" />
      </div>

      <div className="mt-7 flex flex-col gap-6 rounded-xl2 border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgba(17,28,78,0.06)]">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">{t(lang, "nationality")}</label>
          <select
            value={profile.nationality}
            onChange={(e) => setLocalProfile({ ...profile, nationality: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-brand-blue"
          >
            {NATIONALITIES.map((n) => (
              <option key={n.code} value={n.code}>
                {n[lang] ?? n.ko}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">{t(lang, "visaType")}</label>
          <select
            value={profile.visa_type}
            onChange={(e) => setLocalProfile({ ...profile, visa_type: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-brand-blue"
          >
            {VISA_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">{t(lang, "departureDate")}</label>
          <input
            type="date"
            value={profile.departure_date ?? ""}
            onChange={(e) => setLocalProfile({ ...profile, departure_date: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-brand-blue"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">{t(lang, "npsEnrolled")}</label>
          <div className="flex gap-2">
            {[
              { v: true, label: lang === "ko" ? "가입" : lang === "vi" ? "Có" : "Enrolled" },
              { v: false, label: lang === "ko" ? "미가입" : lang === "vi" ? "Không" : "Not enrolled" },
            ].map((opt) => (
              <button
                key={String(opt.v)}
                onClick={() => setLocalProfile({ ...profile, nps_enrolled: opt.v })}
                className={`flex-1 rounded-full border py-2 text-sm ${
                  profile.nps_enrolled === opt.v ? "border-brand-navy bg-brand-navy text-white" : "border-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">{t(lang, "tenureMonths")}</label>
          <input
            type="number"
            min={0}
            value={profile.tenure_months ?? ""}
            onChange={(e) => setLocalProfile({ ...profile, tenure_months: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-brand-blue"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-600">{t(lang, "visitTime")}</label>
          <div className="flex flex-wrap gap-2">
            {VISIT_TIMES.map((vt) => (
              <button
                key={vt.code}
                onClick={() => toggleVisitTime(vt.code)}
                className={`rounded-full border px-4 py-2 text-sm ${
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

      <div className="mt-10 flex flex-col gap-3">
        <PrimaryButton onClick={handleStart}>{t(lang, "start")}</PrimaryButton>
        <button
          onClick={handleDemo}
          disabled={loadingDemo}
          className="w-full rounded-xl2 border border-brand-blue py-3 text-sm font-semibold text-brand-blue disabled:opacity-40"
        >
          {loadingDemo ? "..." : t(lang, "demoMode")}
        </button>
      </div>

    </div>
  );
}
