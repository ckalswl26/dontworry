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
  { href: "/menu", icon: "☰", key: "menuTab" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useStore();
  const lang = state.profile.language;

  return (
    <nav className="bottom-nav print:hidden fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {/* AI 챗봇 진입 FAB - 원형 배경 없이 마스코트가 그대로 떠 있는 느낌, 탭바 위 우측 하단 고정 */}
      {pathname === "/home" && <button
        type="button"
        onClick={() => router.push("/chat")}
        aria-label={t(lang, "aiChatbotTitle")}
        className="absolute bottom-[calc(100%+10px)] right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-brand-sky shadow-[0_8px_18px_rgba(17,28,78,0.2)] transition-transform hover:-translate-y-1 active:scale-95"
      >
        <Mascot
          size={38}
          className="h-[38px] w-[38px] object-contain"
        />
      </button>}

      <div className="grid grid-cols-5 items-stretch py-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-w-0 overflow-hidden flex flex-col items-center justify-start gap-1 px-0.5 py-1 text-center text-[10px] leading-3 ${
                active ? "text-brand-blue font-semibold" : "text-gray-400"
              }`}
            >
              <span className="shrink-0 text-lg leading-5">{item.icon}</span>
              <span className="block min-h-6 w-full max-w-full overflow-hidden break-words [overflow-wrap:anywhere]">
                {t(lang, item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
