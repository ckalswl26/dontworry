"use client";

import { useEffect, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

/** 네이티브 <select>는 옵션 목록이 브라우저 OS 팝업으로 렌더링돼서 폰 프레임
 * 밖으로 튀어나가고 스타일도 못 입힌다. 순수 DOM 요소로 만든 대체 드롭다운. */
export function Dropdown({
  value,
  options,
  onChange,
  placeholder = "",
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition-colors ${
          open ? "border-brand-blue" : "border-slate-200"
        }`}
      >
        <span className={selected ? "font-medium text-brand-navy" : "text-slate-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={`ml-2 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-[0_12px_28px_rgba(17,28,78,0.16)]">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                opt.value === value ? "bg-brand-sky font-semibold text-brand-navy" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
