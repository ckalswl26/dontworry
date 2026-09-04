"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Mascot } from "@/components/Logo";

const ITEMS = [
  { href: "/home", icon: "🏠", key: "home" },
  { href: "/finance", icon: "🏦", key: "financeTab" },
  { href: "/planner", icon: "📊", key: "planner" },
  { href: "/dday", icon: "📅", key: "dday" },
  { href: "/my", icon: "👤", key: "myInfo" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {/* AI 챗봇 진입 FAB - 원형 배경 없이 마스코트가 그대로 떠 있는 느낌, 탭바 위 우측 하단 고정 */}
      <button
        type="button"
        onClick={() => router.push("/home#ai-chat")}
        aria-label={t(lang, "aiChatbotTitle")}
        className="absolute bottom-[68px] right-4 z-30 transition-transform hover:-translate-y-1"
      >
        <Mascot
          size={72}
          className="h-[72px] w-[72px] object-contain drop-shadow-[0_12px_18px_rgba(17,28,78,0.35)]"
        />
      </button>

      <div className="flex items-center justify-around py-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
                active ? "text-brand-blue font-semibold" : "text-gray-400"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {t(lang, item.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
