"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Card } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { LogoWordmark } from "@/components/Logo";

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

export default function HomePage() {
  const router = useRouter();
  const { state, setLastQuestion, setAssetsHidden } = useStore();
  const lang = state.profile.language;
  const [question, setQuestion] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && !state.onboarded) router.replace("/");
  }, [mounted, state.onboarded, router]);

  if (!mounted) return null;

  const days = daysUntil(state.profile.departure_date);
  const greeting = state.profile.name
    ? t(lang, "greetingWithName").replace("{name}", state.profile.name)
    : t(lang, "greetingNoName");

  const submitQuestion = () => {
    if (!question.trim()) {
      router.push("/tasks");
      return;
    }
    setLastQuestion(question);
    router.push("/intent");
  };

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-6">
      <div className="flex items-center justify-between">
        <LogoWordmark height={28} />
      </div>

      <p className="mt-4 text-lg font-bold text-brand-navy">{greeting}</p>

      <div className="mt-3 rounded-xl2 bg-brand-navy p-5 text-white">
        <p className="text-xs text-white/70">{t(lang, "daysToDeparture")}</p>
        <p className="mt-1 text-4xl font-black">{days !== null ? `D-${days}` : "D-?"}</p>
        {days !== null && (
          <div className="mt-3 h-1.5 w-full rounded-full bg-white/20">
            <div
              className="h-1.5 rounded-full bg-brand-yellow"
              style={{ width: `${Math.max(4, Math.min(100, 100 - days))}%` }}
            />
          </div>
        )}
        <p className="mt-3 text-xs text-white/70">
          {state.profile.nationality} · {state.profile.visa_type}
        </p>
      </div>

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{t(lang, "myAssets")}</p>
          <button
            onClick={() => setAssetsHidden(!state.assetsHidden)}
            aria-label={state.assetsHidden ? "show assets" : "hide assets"}
            className="text-lg text-gray-400"
          >
            {state.assetsHidden ? "🙈" : "👁"}
          </button>
        </div>
        <p className="mt-1 text-2xl font-black text-brand-navy">
          {state.assetsHidden ? "●●●●●●원" : formatWon(state.planner.current_savings)}
        </p>
        {state.planner.target_amount > 0 ? (
          <p className="mt-1 text-xs text-gray-400">
            {t(lang, "savingsGoalLabel")} {state.assetsHidden ? "●●●●●●원" : formatWon(state.planner.target_amount)}
          </p>
        ) : (
          <button onClick={() => router.push("/planner")} className="mt-1 text-xs text-brand-blue">
            {t(lang, "setGoalInPlanner")} ›
          </button>
        )}
      </Card>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-gray-500">{t(lang, "aiChatbotTitle")}</p>
        <div className="flex items-center gap-2 rounded-xl2 border border-gray-200 px-4 py-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitQuestion()}
            placeholder={t(lang, "aiChatbotPlaceholder")}
            className="flex-1 text-sm outline-none"
          />
          <button onClick={submitQuestion} className="text-brand-blue" aria-label="submit">
            ➤
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <p className="text-sm font-semibold text-gray-500">{t(lang, "quickLinks")}</p>

        <Card className="flex cursor-pointer items-center justify-between" >
          <button className="flex w-full items-center justify-between" onClick={() => router.push("/planner")}>
            <div className="text-left">
              <p className="font-semibold text-brand-navy">{t(lang, "plannerShortcut")}</p>
              <p className="text-xs text-gray-500">{t(lang, "plannerShortcutDesc")}</p>
            </div>
            <span>›</span>
          </button>
        </Card>

        <Card>
          <button className="flex w-full items-center justify-between" onClick={() => router.push("/dday")}>
            <div className="text-left">
              <p className="font-semibold text-brand-navy">{t(lang, "ddayShortcut")}</p>
              <p className="text-xs text-gray-500">{t(lang, "ddayShortcutDesc")}</p>
            </div>
            <span>›</span>
          </button>
        </Card>

        <Card>
          <button className="flex w-full items-center justify-between" onClick={() => router.push("/briefing")}>
            <div className="text-left">
              <p className="font-semibold text-brand-navy">{t(lang, "briefingTitle")}</p>
              <p className="text-xs text-gray-500">{t(lang, "consultShortcutDesc")}</p>
            </div>
            <span>›</span>
          </button>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
