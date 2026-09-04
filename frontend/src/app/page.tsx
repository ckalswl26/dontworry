"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LogoWordmark, Mascot } from "@/components/Logo";
import { PrimaryButton } from "@/components/Card";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const LANGS: { code: Lang; label: string; greeting: string }[] = [
  { code: "ko", label: "한국어", greeting: "안녕하세요" },
  { code: "en", label: "English", greeting: "Welcome" },
  { code: "vi", label: "Tiếng Việt", greeting: "Xin chào" },
];

const SPLASH_TITLE: Record<Lang, string> = {
  ko: "한국 생활의 금융 고민,\n돈워리가 함께 해결해요",
  en: "Money worries in Korea,\nDon't Worry solves them with you",
  vi: "Nỗi lo tài chính khi ở Hàn Quốc,\nDon't Worry cùng bạn giải quyết",
};

const SPLASH_TAGLINE: Record<Lang, string> = {
  ko: "외국인 근로자를 위한 금융 서비스",
  en: "A financial service for foreign workers",
  vi: "Dịch vụ tài chính dành cho lao động nước ngoài",
};

export default function SplashPage() {
  const router = useRouter();
  const { state, setLang } = useStore();
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Lang>(state.profile.language);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (ready && state.onboarded) {
      router.replace("/home");
    }
  }, [ready, state.onboarded, router]);

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-6 py-7 text-center">
      <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand-sky" />
      <div className="relative flex flex-col items-center">
        <LogoWordmark height={40} />
        <p className="mt-2 text-xs font-semibold text-slate-500">{SPLASH_TAGLINE[selected]}</p>
        <div className="relative mt-3 flex h-[250px] w-full items-center justify-center">
          <Mascot
            size={208}
            className="mascot-float relative z-[1] h-52 w-52 object-contain drop-shadow-[0_18px_24px_rgba(17,28,78,0.22)]"
          />
          <span aria-hidden="true" className="mascot-shadow absolute bottom-3 h-4 w-28 rounded-full bg-brand-navy/15 blur-md" />
        </div>
        <div className="flex h-[142px] w-full items-center justify-center">
        <h1 className={`whitespace-pre-line font-black tracking-[-0.05em] text-brand-navy ${selected === "ko" ? "text-[26px] leading-[1.3]" : selected === "en" ? "text-[23px] leading-[1.25]" : "text-[22px] leading-[1.25]"}`}>
          {SPLASH_TITLE[selected]}
        </h1>
        </div>
      </div>

      <div className="relative mt-auto w-full">
        <p className="mb-3 text-left text-sm font-bold text-brand-navy">
          {t(selected, "langSelect")} <span className="font-normal text-slate-400">Select language</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelected(l.code)}
              className={`flex h-[78px] flex-col items-center justify-center rounded-xl2 border px-2 text-center ${selected === l.code ? "border-brand-blue bg-brand-sky shadow-sm" : "border-slate-200 bg-white"}`}
            >
              <span className="block text-xs text-slate-400">{l.greeting}</span>
              <span className="mt-1 block text-sm font-bold text-brand-navy">{l.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={() => { setLang(selected); router.push("/onboarding"); }}>
            {t(selected, "start")}
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}
