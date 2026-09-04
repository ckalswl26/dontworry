"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const ITEMS = [
  { href: "/home", icon: "🏠", key: "home" },
  { href: "/finance", icon: "🏦", key: "financeTab" },
  { href: "/planner", icon: "📊", key: "planner" },
  { href: "/dday", icon: "📅", key: "dday" },
  { href: "/my", icon: "👤", key: "myInfo" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { state } = useStore();
  const lang = state.profile.language;

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-gray-100 bg-white/95 backdrop-blur">
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
