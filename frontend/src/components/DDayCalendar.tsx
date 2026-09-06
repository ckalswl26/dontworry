"use client";

import { useMemo, useState } from "react";
import type { DDayItem, Lang } from "@/lib/types";
import { t } from "@/lib/i18n";

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function DDayCalendar({
  departureDate,
  items,
  onSelectDate,
  lang,
}: {
  departureDate: string;
  items: DDayItem[];
  onSelectDate?: (dateKey: string, itemsOnDate: DDayItem[]) => void;
  lang: Lang;
}) {
  const today = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);
  const departure = useMemo(() => new Date(`${departureDate}T00:00:00`), [departureDate]);
  const weekdayLabels = useMemo(() => Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(lang, { weekday: "short" }).format(new Date(2024, 0, 7 + day))), [lang]);

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  // day_offset은 출국일 기준 상대값이라, 실제 달력에 찍으려면 출국일에 더해서 실제 날짜로 바꾼다.
  const itemsByDate = useMemo(() => {
    const map = new Map<string, DDayItem[]>();
    for (const item of items) {
      const key = toDateKey(addDays(departure, item.day_offset));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items, departure]);

  const departureKey = toDateKey(departure);
  const todayKey = toDateKey(today);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const selectDate = (date: Date) => {
    const key = toDateKey(date);
    setSelected(key);
    onSelectDate?.(key, itemsByDate.get(key) ?? []);
  };

  return (
    <div className="rounded-xl2 border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(17,28,78,0.06)]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50"
          aria-label="이전 달"
        >
          ‹
        </button>
        <p className="text-sm font-extrabold text-brand-navy">
          {new Intl.DateTimeFormat(lang, { year: "numeric", month: "long" }).format(cursor)}
        </p>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {weekdayLabels.map((w, i) => (
          <span key={w} className={`text-[10px] font-semibold ${i === 0 ? "text-brand-red" : "text-slate-400"}`}>
            {w}
          </span>
        ))}

        {cells.map((date) => {
          const key = toDateKey(date);
          const inMonth = date.getMonth() === cursor.getMonth();
          const dayItems = itemsByDate.get(key) ?? [];
          const hasVisitEvent = dayItems.some((it) => it.requires_visit);
          const isDeparture = key === departureKey;
          const isToday = key === todayKey;
          const isSelected = key === selected;

          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => selectDate(date)}
              className={`relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-xs ${
                !inMonth
                  ? "text-transparent"
                  : isDeparture
                  ? "bg-brand-navy font-bold text-white"
                  : isSelected
                  ? "bg-brand-sky font-bold text-brand-navy"
                  : isToday
                  ? "border border-brand-blue font-bold text-brand-navy"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {date.getDate()}
              {dayItems.length > 0 && !isDeparture && (
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full ${hasVisitEvent ? "bg-brand-red" : "bg-brand-blue"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand-navy" /> {t(lang, "departureDate")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-red" /> {t(lang, "signalRed")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" /> {t(lang, "todo")}
        </span>
      </div>
    </div>
  );
}
