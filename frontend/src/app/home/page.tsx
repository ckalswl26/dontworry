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
  const { state, setAssetsHidden } = useStore();
  const lang = state.profile.language;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted && !state.onboarded) router.replace("/");
  }, [mounted, state.onboarded, router]);

  if (!mounted) return null;

  const days = daysUntil(state.profile.departure_date);
  const maturityDays = daysUntil(state.savingsTracking.maturityDate);
  const greeting = state.profile.name
    ? t(lang, "greetingWithName").replace("{name}", state.profile.name)
    : t(lang, "greetingNoName");

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <LogoWordmark height={28} />
        <button
          type="button"
          onClick={() => router.push("/my")}
          aria-label="내 정보"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[10px] font-black text-white shadow-sm"
        >
          MY
        </button>
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
        {state.savingsTracking.maturityDate && (
          <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3">
            <p className="text-xs text-white/70">{state.savingsTracking.productName || "저축 상품"} 만기</p>
            <p className="text-lg font-black">
              {maturityDays !== null ? `D-${maturityDays}` : state.savingsTracking.maturityDate}
            </p>
          </div>
        )}
        <p className="mt-3 text-xs text-white/70">
          {state.profile.nationality} · {state.profile.visa_type}
        </p>
      </div>

      {state.savingsTracking.maturityDate && days !== null && maturityDays !== null && (
        maturityDays <= days ? (
          <Card className="mt-3 border-brand-blue/15 bg-brand-sky/40">
            <p className="text-sm leading-6 text-brand-navy">
              만기 후 출국까지 <span className="font-black">{days - maturityDays}일</span> 남아요. 귀국 전 송금을
              준비할 수 있어요.
            </p>
            <button onClick={() => router.push("/tasks/overseas_remittance")} className="mt-1 text-xs font-semibold text-brand-blue">
              해외송금 안내 보기 ›
            </button>
          </Card>
        ) : (
          <Card className="mt-3 border-brand-red/20 bg-red-50">
            <p className="text-sm leading-6 text-brand-red">
              ⚠ 적금 만기가 출국일보다 <span className="font-black">{maturityDays - days}일</span> 늦어요. 중도해지
              조건을 확인하세요.
            </p>
          </Card>
        )
      )}

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{t(lang, "myAssets")}</p>
          <button
            onClick={() => setAssetsHidden(!state.assetsHidden)}
            aria-label={state.assetsHidden ? "금액 보기" : "금액 숨김"}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-brand-sky hover:text-brand-blue"
          >
            {state.assetsHidden ? "보기" : "숨김"}
          </button>
        </div>
        <p className={`mt-1 ${state.assetsHidden ? "text-sm font-semibold text-slate-400" : "text-2xl font-black text-brand-navy"}`}>
          {state.assetsHidden ? "금액 숨김" : formatWon(state.planner.current_savings)}
        </p>
        {state.planner.target_amount > 0 ? (
          <p className="mt-1 text-xs text-gray-400">
            {t(lang, "savingsGoalLabel")} {state.assetsHidden ? "금액 숨김" : formatWon(state.planner.target_amount)}
          </p>
        ) : (
          <button onClick={() => router.push("/planner")} className="mt-1 text-xs text-brand-blue">
            {t(lang, "setGoalInPlanner")} ›
          </button>
        )}
      </Card>

      <div className="mt-6">
        <p className="text-sm font-semibold text-gray-500">{t(lang, "quickLinks")}</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { icon: "💱", label: "환율 계산", href: "/fx", tone: "bg-blue-50" },
            { icon: "📊", label: "자산 플래너", href: "/planner", tone: "bg-violet-50" },
            { icon: "📅", label: "D-Day", href: "/dday", tone: "bg-amber-50" },
            { icon: "📋", label: "재무 브리핑", href: "/briefing", tone: "bg-emerald-50" },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white px-1 py-4 text-center shadow-[0_8px_24px_rgba(17,28,78,0.07)] transition active:scale-95"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${item.tone}`} aria-hidden="true">{item.icon}</span>
              <span className="whitespace-nowrap text-[11px] font-bold text-brand-navy">{item.label}</span>
            </button>
          ))}
        </div>
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
