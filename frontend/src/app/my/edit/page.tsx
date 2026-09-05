"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, PrimaryButton } from "@/components/Card";
import { Dropdown } from "@/components/Dropdown";
import { NATIONALITIES, VISA_TYPES } from "@/lib/profileOptions";
import { pickLang3 } from "@/lib/types";

export default function MyEditPage() {
  const router = useRouter();
  const { state, setProfile } = useStore();
  const lang = state.profile.language;
  const [draft, setDraft] = useState(state.profile);

  const handleSave = () => {
    setProfile(draft);
    router.back();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="프로필 수정" onBack={() => router.back()} />

      <div className="flex-1 px-5 py-6">
        <div className="flex flex-col gap-4 rounded-xl2 border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(17,28,78,0.06)]">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "nameLabel")}</label>
            <input
              type="text"
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t(lang, "namePlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "nationality")}</label>
            <Dropdown
              value={draft.nationality}
              onChange={(v) => setDraft({ ...draft, nationality: v })}
              options={NATIONALITIES.map((n) => ({ value: n.code, label: pickLang3(n, lang) }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "visaType")}</label>
            <Dropdown
              value={draft.visa_type}
              onChange={(v) => setDraft({ ...draft, visa_type: v })}
              options={VISA_TYPES.map((v) => ({ value: v, label: v }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">{t(lang, "departureDate")}</label>
            <input
              type="date"
              value={draft.departure_date ?? ""}
              onChange={(e) => setDraft({ ...draft, departure_date: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-blue"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <PrimaryButton onClick={handleSave}>저장</PrimaryButton>
          <button onClick={() => router.back()} className="w-full rounded-xl2 border border-slate-200 py-2.5 text-xs font-semibold text-slate-500">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
