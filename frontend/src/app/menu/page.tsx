"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Card } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";

const CATEGORIES: { titleKey: string; items: { icon: string; labelKey: string; descKey: string; href: string }[] }[] = [
  {
    titleKey: "menuCategoryAssets",
    items: [
      { icon: "💱", labelKey: "menuFxTitle", descKey: "menuFxDesc", href: "/fx" },
      { icon: "📊", labelKey: "menuPlannerTitle", descKey: "menuPlannerDesc", href: "/planner" },
      { icon: "🏦", labelKey: "menuFinanceTitle", descKey: "menuFinanceDesc", href: "/finance" },
      { icon: "🧳", labelKey: "menuSettlementTitle", descKey: "menuSettlementDesc", href: "/settlement-checklist" },
      { icon: "💰", labelKey: "minWageCheckTitle", descKey: "minWageCheckDesc", href: "/wage-check" },
      { icon: "🧾", labelKey: "menuWageSlipTitle", descKey: "menuWageSlipDesc", href: "/wage-slip-check" },
      { icon: "📝", labelKey: "menuPassportPrepTitle", descKey: "menuPassportPrepDesc", href: "/passport-prep" },
    ],
  },
  {
    titleKey: "menuCategoryDeparturePrep",
    items: [
      { icon: "📅", labelKey: "menuDdayTitle", descKey: "menuDdayDesc", href: "/dday" },
      { icon: "✅", labelKey: "menuTasksTitle", descKey: "menuTasksDesc", href: "/tasks" },
      { icon: "🧾", labelKey: "menuBriefingTitle", descKey: "menuBriefingDesc", href: "/briefing" },
      { icon: "🏧", labelKey: "consultCard", descKey: "menuConsultCardDesc", href: "/consult-card" },
      { icon: "🌐", labelKey: "menuBranchesTitle", descKey: "menuBranchesDesc", href: "/branches" },
    ],
  },
  {
    titleKey: "menuCategoryHelp",
    items: [
      { icon: "📋", labelKey: "wageClaimTitle", descKey: "wageClaimDesc", href: "/guides/wage_claim" },
      { icon: "🔁", labelKey: "reentryTitle", descKey: "reentryDesc", href: "/guides/reentry_special_case" },
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
          <p className="truncate font-bold text-brand-navy">{state.profile.name || t(lang, "nameNotSet")}</p>
          <p className="text-xs text-slate-500">{t(lang, "viewMyInfo")} ›</p>
        </div>
      </button>

      {CATEGORIES.map((cat) => (
        <div key={cat.titleKey} className="mt-6">
          <p className="text-sm font-semibold text-gray-500">{t(lang, cat.titleKey)}</p>
          <div className="mt-2 flex flex-col gap-2">
            {cat.items.map((item) => (
              <Card key={item.href}>
                <button className="flex w-full items-center justify-between gap-2" onClick={() => router.push(item.href)}>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold tracking-[-0.035em] text-brand-navy">
                      <span className="shrink-0 text-base" aria-hidden="true">{item.icon}</span>
                      <span>{t(lang, item.labelKey)}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">{t(lang, item.descKey)}</p>
                  </div>
                  <span className="shrink-0 text-sm text-brand-navy" aria-hidden="true">›</span>
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
