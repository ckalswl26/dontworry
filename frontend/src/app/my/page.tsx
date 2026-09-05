"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { Dropdown } from "@/components/Dropdown";
import type { Lang } from "@/lib/types";

const NATIONALITIES = ["VN", "TH", "PH", "ID", "KH", "NP", "MM", "LA", "TL", "BD", "PK", "LK", "KG", "TJ", "UZ", "CN", "MN"];
const VISA_TYPES = ["E-9", "H-2", "E-8_LEGACY_TRAINING_EMPLOYMENT", "E-8_SEASONAL_WORK"];

export default function MyPage() {
  const router = useRouter();
  const { state, setProfile, setLang, reset } = useStore();
  const lang = state.profile.language;
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "myTitle")} onBack={() => router.back()} />

      <div className="flex-1 px-5 pb-28 pt-6">
        <div className="mb-5">
          <h2 className="text-xl font-black tracking-tight text-brand-navy">
            {lang === "ko" ? "내 정보를 관리해요" : lang === "vi" ? "Quản lý thông tin" : "Manage your information"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {lang === "ko" ? "맞춤 금융 안내에 필요한 기본 정보예요." : lang === "vi" ? "Thông tin cơ bản cho hướng dẫn tài chính phù hợp." : "Basic details used for personalized financial guidance."}
          </p>
        </div>

        <Card className="!p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <div><p className="text-sm font-extrabold text-brand-navy">프로필</p><p className="mt-0.5 text-[11px] text-slate-400">맞춤 안내에 사용하는 정보</p></div>
            <button type="button" onClick={() => setEditing(!editing)} className="rounded-full bg-brand-sky px-3 py-1.5 text-xs font-bold text-brand-blue">{editing ? "완료" : "수정"}</button>
          </div>
          <div className="mx-5 border-t border-slate-100" />
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-5 py-3">
            <label htmlFor="profile-name" className="shrink-0 text-sm font-semibold text-slate-500">{t(lang, "nameLabel")}</label>
            {editing ? <input
              id="profile-name"
              type="text"
              value={state.profile.name ?? ""}
              onChange={(e) => setProfile({ name: e.target.value })}
              placeholder={t(lang, "namePlaceholder")}
              className="min-w-0 max-w-[240px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm focus:border-brand-blue focus:bg-white"
            /> : <span className="text-sm font-bold text-brand-navy">{state.profile.name || "미입력"}</span>}
          </div>
          <div className="mx-5 border-t border-slate-100" />
          <div className="flex min-h-[58px] items-center justify-between px-5 py-3">
            <span className="text-sm font-semibold text-slate-500">{t(lang, "nationality")}</span>
            {editing ? <div className="w-32"><Dropdown value={state.profile.nationality} onChange={(v) => setProfile({ nationality: v })} options={NATIONALITIES.map((code) => ({ value: code, label: code }))} /></div> : <span className="rounded-lg bg-brand-sky px-3 py-1.5 text-sm font-bold text-brand-navy">{state.profile.nationality}</span>}
          </div>
          <div className="mx-5 border-t border-slate-100" />
          <div className="flex min-h-[58px] items-center justify-between px-5 py-3">
            <span className="text-sm font-semibold text-slate-500">{t(lang, "visaType")}</span>
            {editing ? <div className="w-52"><Dropdown value={state.profile.visa_type} onChange={(v) => setProfile({ visa_type: v })} options={VISA_TYPES.map((code) => ({ value: code, label: code }))} /></div> : <span className="rounded-lg bg-brand-cream px-3 py-1.5 text-sm font-bold text-brand-navy">{state.profile.visa_type}</span>}
          </div>
          <div className="mx-5 border-t border-slate-100" />
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-5 py-3">
            <label htmlFor="departure-date" className="shrink-0 text-sm font-semibold text-slate-500">{t(lang, "departureDate")}</label>
            {editing ? <input
              id="departure-date"
              type="date"
              value={state.profile.departure_date ?? ""}
              onChange={(e) => setProfile({ departure_date: e.target.value })}
              className="min-w-0 max-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-blue focus:bg-white"
            /> : <span className="text-sm font-bold text-brand-navy">{state.profile.departure_date || "미입력"}</span>}
          </div>
        </Card>

        <Card className="mt-4">
          <p className="mb-3 text-sm font-bold text-brand-navy">{t(lang, "langSelect")}</p>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-1.5">
            {(["ko", "en", "vi"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-lg py-2.5 text-sm font-bold ${
                  lang === l ? "bg-brand-navy text-white shadow-sm" : "text-slate-500 hover:bg-white"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </Card>

        <button
          onClick={() => router.push("/consult-card")}
          className="mt-4 flex w-full items-center justify-between rounded-xl2 border border-brand-blue/20 bg-brand-sky px-5 py-4 text-left text-sm font-bold text-brand-navy shadow-sm"
        >
          <span><span className="mr-2">🏦</span>{t(lang, "consultCard")}</span><span className="text-brand-blue">›</span>
        </button>

        <button
          onClick={() => {
            reset();
            router.push("/");
          }}
          className="mx-auto mt-5 block px-4 py-2 text-xs font-semibold text-slate-400 underline decoration-slate-300 underline-offset-4"
        >
          {lang === "ko" ? "정보 초기화" : lang === "vi" ? "Đặt lại thông tin" : "Reset info"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
