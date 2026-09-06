"use client";

import { useEffect, useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Props = {
  value: string | null | undefined;
  onChange: (value: string) => void;
  lang: Lang;
  id?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
};

function splitDate(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match ? { year: match[1], month: match[2], day: match[3] } : { year: "", month: "", day: "" };
}

export function LocalizedDateInput({ value, onChange, lang, id, min, max, disabled, className = "" }: Props) {
  const parsed = splitDate(value);
  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  useEffect(() => {
    const next = splitDate(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value]);

  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [year, month]);

  const commit = (nextYear: string, nextMonth: string, nextDay: string) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
    if (!nextYear && !nextMonth && !nextDay) return onChange("");
    if (!/^\d{4}$/.test(nextYear) || !nextMonth || !nextDay) return;
    const iso = `${nextYear}-${nextMonth}-${nextDay}`;
    const valid = splitDate(iso).year && Number(nextDay) <= new Date(Number(nextYear), Number(nextMonth), 0).getDate();
    if (valid && (!min || iso >= min) && (!max || iso <= max)) onChange(iso);
  };

  const fieldClass = "min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm text-brand-navy shadow-sm outline-none focus:border-brand-blue disabled:bg-slate-50";

  return (
    <div id={id} className={`grid grid-cols-[1.25fr_1fr_1fr] gap-2 ${className}`}>
      <label className="min-w-0">
        <span className="mb-1 block text-[10px] font-semibold text-slate-500">{t(lang, "dateYear")}</span>
        <input
          type="number"
          inputMode="numeric"
          min={1900}
          max={2199}
          value={year}
          disabled={disabled}
          aria-label={t(lang, "dateYear")}
          onChange={(event) => commit(event.target.value.replace(/\D/g, "").slice(0, 4), month, day)}
          className={`w-full ${fieldClass}`}
        />
      </label>
      <label className="min-w-0">
        <span className="mb-1 block text-[10px] font-semibold text-slate-500">{t(lang, "dateMonth")}</span>
        <select value={month} disabled={disabled} aria-label={t(lang, "dateMonth")} onChange={(event) => commit(year, event.target.value, day)} className={`w-full ${fieldClass}`}>
          <option value="">--</option>
          {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => <option key={item} value={item}>{Number(item)}</option>)}
        </select>
      </label>
      <label className="min-w-0">
        <span className="mb-1 block text-[10px] font-semibold text-slate-500">{t(lang, "dateDay")}</span>
        <select value={Number(day) <= daysInMonth ? day : ""} disabled={disabled} aria-label={t(lang, "dateDay")} onChange={(event) => commit(year, month, event.target.value)} className={`w-full ${fieldClass}`}>
          <option value="">--</option>
          {Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => <option key={item} value={item}>{Number(item)}</option>)}
        </select>
      </label>
    </div>
  );
}
