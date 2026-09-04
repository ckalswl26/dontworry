"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LogoWordmark } from "@/components/Logo";
import type { Lang } from "@/lib/types";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
];

export default function SplashPage() {
  const router = useRouter();
  const { state, setLang } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (ready && state.onboarded) {
      router.replace("/home");
    }
  }, [ready, state.onboarded, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <LogoWordmark height={64} />
        <p className="text-sm text-gray-500">DONWORRY · 온보딩</p>
      </div>

      <div className="w-full max-w-xs">
        <p className="mb-3 text-sm font-medium text-gray-500">언어를 선택하세요 / Select language</p>
        <div className="flex flex-col gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                router.push("/onboarding");
              }}
              className="rounded-full border border-gray-200 py-3 font-medium text-brand-navy hover:border-brand-blue"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
