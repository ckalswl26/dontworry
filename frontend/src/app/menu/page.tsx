"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Card } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";

const CATEGORIES: { title: string; items: { icon: string; label: string; desc: string; href: string }[] }[] = [
  {
    title: "자산관리",
    items: [
      { icon: "💱", label: "실시간 환율 계산기", desc: "환율 확인하고 계산해보기", href: "/fx" },
      { icon: "📊", label: "체류기간 자산목표 플래너", desc: "필요 월 저축액 계산하기", href: "/planner" },
      { icon: "🏦", label: "금융상품", desc: "내 조건에 맞는 상품 찾기", href: "/finance" },
      { icon: "💰", label: "최저임금 확인하기", desc: "내 월급이 최저임금 기준인지 확인", href: "/wage-check" },
      { icon: "📝", label: "계좌개설 준비", desc: "비대면 계좌개설 정보 미리 정리하기", href: "/passport-prep" },
    ],
  },
  {
    title: "출국 준비",
    items: [
      { icon: "📅", label: "D-Day 금융체크", desc: "시점별로 할 일 확인하기", href: "/dday" },
      { icon: "✅", label: "업무별 확인 결과", desc: "필요서류와 처리 순서 확인", href: "/tasks" },
      { icon: "🧾", label: "AI 재무 브리핑", desc: "지금 해야 할 일 Top 3", href: "/briefing" },
      { icon: "🏧", label: "은행원용 사전상담 카드", desc: "방문 예약 정보 준비하기", href: "/consult-card" },
      { icon: "🌐", label: "다국어 상담 지점 찾기", desc: "통역 지원되는 지점 찾기", href: "/branches" },
    ],
  },
  {
    title: "도움 정보",
    items: [
      { icon: "📋", label: "임금을 못 받았어요", desc: "임금체불 신고 방법 안내", href: "/guides/wage_claim" },
      { icon: "🔁", label: "다시 한국에서 일하고 싶어요", desc: "성실근로자 재입국 특례 안내", href: "/guides/reentry_special_case" },
    ],
  },
];

export default function MenuPage() {
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-28 pt-6">
      <p className="text-xl font-black tracking-tight text-brand-navy">{t(lang, "menuTab")}</p>

      <button
        type="button"
        onClick={() => router.push("/my")}
        className="mt-4 flex w-full items-center gap-3 rounded-xl2 bg-brand-sky/50 p-4 text-left shadow-sm"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">
          MY
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-brand-navy">{state.profile.name || "이름 미입력"}</p>
          <p className="text-xs text-slate-500">내 정보 보기 ›</p>
        </div>
      </button>

      {CATEGORIES.map((cat) => (
        <div key={cat.title} className="mt-6">
          <p className="text-sm font-semibold text-gray-500">{cat.title}</p>
          <div className="mt-2 flex flex-col gap-2">
            {cat.items.map((item) => (
              <Card key={item.href}>
                <button className="flex w-full items-center justify-between" onClick={() => router.push(item.href)}>
                  <div className="text-left">
                    <p className="font-semibold text-brand-navy">
                      {item.icon} {item.label}
                    </p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <span>›</span>
                </button>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <BottomNav />
    </div>
  );
}
