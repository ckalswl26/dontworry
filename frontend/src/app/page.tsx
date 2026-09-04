"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LogoWordmark, Mascot } from "@/components/Logo";
import { PrimaryButton } from "@/components/Card";
import type { Lang } from "@/lib/types";

const LANGS: { code: Lang; label: string; greeting: string }[] = [
  { code: "ko", label: "한국어", greeting: "안녕하세요" },
  { code: "en", label: "English", greeting: "Welcome" },
  { code: "vi", label: "Tiếng Việt", greeting: "Xin chào" },
];

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
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6 py-7 text-center">
      <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand-sky" />
      <div className="relative flex flex-col items-center">
        <LogoWordmark height={40} />
        <p className="mt-2 text-xs font-semibold text-slate-500">외국인 근로자를 위한 금융 서비스</p>
        <div className="mt-4 h-52 w-52 overflow-hidden rounded-full bg-gradient-to-b from-brand-sky to-white p-1 shadow-[0_18px_45px_rgba(8,104,247,0.16)]">
          <Mascot size={208} className="h-full w-full scale-110 object-contain" />
        </div>
        <h1 className="mt-5 text-[26px] font-black leading-[1.3] tracking-[-0.05em] text-brand-navy">
          한국 생활의 금융 고민,<br />돈워리가 함께 해결해요
        </h1>
      </div>

      <div className="relative mt-7 w-full">
        <p className="mb-3 text-left text-sm font-bold text-brand-navy">언어를 선택하세요 <span className="font-normal text-slate-400">Select language</span></p>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelected(l.code)}
              className={`rounded-xl2 border px-2 py-3 text-center ${selected === l.code ? "border-brand-blue bg-brand-sky shadow-sm" : "border-slate-200 bg-white"}`}
            >
              <span className="block text-xs text-slate-400">{l.greeting}</span>
              <span className="mt-1 block text-sm font-bold text-brand-navy">{l.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={() => { setLang(selected); router.push("/onboarding"); }}>시작하기</PrimaryButton>
        </div>
      </div>
    </main>
  );
}
