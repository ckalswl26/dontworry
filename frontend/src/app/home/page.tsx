"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Card } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { LogoWordmark, Mascot } from "@/components/Logo";
import { FxCalculatorCard } from "@/components/FxCalculatorCard";

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export default function HomePage() {
  const router = useRouter();
  const { state, setLastQuestion, setAssetsHidden } = useStore();
  const lang = state.profile.language;
  const [question, setQuestion] = useState("");
  const [mounted, setMounted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    setMounted(true);
    const speechWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    setSpeechSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
  }, []);
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

  const startVoiceInput = () => {
    const speechWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = lang === "ko" ? "ko-KR" : lang === "vi" ? "vi-VN" : "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => setQuestion(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <LogoWordmark height={28} />
      </div>

      <p className="mt-4 text-lg font-bold text-brand-navy">{greeting}</p>

      {state.consultation.ready && (
        <button
          type="button"
          onClick={() => router.push("/consult-card")}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-brand-sky px-4 py-3 text-left shadow-sm"
        >
          <span><span className="mr-2">✓</span><span className="text-sm font-bold text-brand-navy">상담 준비 완료</span></span>
          <span className="text-xs font-semibold text-brand-blue">카드 보기 ›</span>
        </button>
      )}

      <div className="mt-3 rounded-xl2 bg-gradient-to-br from-brand-navy to-[#24397E] p-5 text-white shadow-[0_12px_30px_rgba(17,28,78,0.2)]">
        <p className="text-xs text-white/70">{t(lang, "daysToDeparture")}</p>
        <p className={`${days !== null ? "text-4xl" : "text-xl"} mt-1 font-black`}>{days !== null ? `D-${days}` : "출국예정일 미입력"}</p>
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

      <FxCalculatorCard />

      <div id="ai-chat" className="mt-5 scroll-mt-6">
        <p className="mb-2 text-sm font-bold text-brand-navy">{t(lang, "aiChatbotTitle")}</p>
        <div className="flex items-center gap-3 rounded-xl2 border border-brand-blue/20 bg-brand-sky/50 p-3 shadow-sm">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm"><Mascot size={44} className="h-full w-full scale-125 object-contain" /></div>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitQuestion()}
            placeholder={t(lang, "aiChatbotPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {speechSupported && (
            <button type="button" onClick={startVoiceInput} aria-label="음성으로 입력" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${listening ? "bg-red-50 text-brand-red" : "bg-white text-brand-navy"}`}>
              🎙️
            </button>
          )}
          <button onClick={submitQuestion} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-white shadow-sm" aria-label="submit">
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

      <div className="mt-6 flex flex-col gap-3">
        <p className="text-sm font-semibold text-gray-500">도움이 필요하신가요?</p>

        <Card>
          <button className="flex w-full items-center justify-between" onClick={() => router.push("/wage-check")}>
            <div className="text-left">
              <p className="font-semibold text-brand-navy">💰 최저임금 확인하기</p>
              <p className="text-xs text-gray-500">내 월급이 최저임금 기준인지 확인해보세요</p>
            </div>
            <span>›</span>
          </button>
        </Card>

        <Card>
          <button className="flex w-full items-center justify-between" onClick={() => router.push("/guides/wage_claim")}>
            <div className="text-left">
              <p className="font-semibold text-brand-navy">📋 임금을 못 받았어요</p>
              <p className="text-xs text-gray-500">임금체불 신고 방법 안내</p>
            </div>
            <span>›</span>
          </button>
        </Card>

        <Card>
          <button className="flex w-full items-center justify-between" onClick={() => router.push("/guides/reentry_special_case")}>
            <div className="text-left">
              <p className="font-semibold text-brand-navy">🔁 다시 한국에서 일하고 싶어요</p>
              <p className="text-xs text-gray-500">성실근로자 재입국 특례 안내</p>
            </div>
            <span>›</span>
          </button>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
