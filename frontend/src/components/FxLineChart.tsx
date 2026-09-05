"use client";

import { useRef, useState } from "react";
import type { FxHistoryPoint } from "@/lib/types";

const VIEW_W = 300;
const VIEW_H = 130;
const PAD_TOP = 10;
const PAD_BOTTOM = 10;

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function FxLineChart({ points }: { points: FxHistoryPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return <p className="py-8 text-center text-sm text-gray-400">-</p>;
  }

  const rates = points.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;
  const usableH = VIEW_H - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * VIEW_W,
    y: PAD_TOP + usableH - ((p.rate - min) / range) * usableH,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`;

  const active = activeIndex !== null ? points[activeIndex] : null;
  const activeCoord = activeIndex !== null ? coords[activeIndex] : null;

  const updateActiveFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (points.length - 1));
    setActiveIndex(idx);
  };

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>{max.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mt-1 w-full touch-none"
        onPointerMove={(e) => updateActiveFromClientX(e.clientX)}
        onPointerDown={(e) => updateActiveFromClientX(e.clientX)}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id="fxAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#fxAreaGradient)" />
        <path d={linePath} fill="none" stroke="#EF4444" strokeWidth="1.5" />
        {activeCoord && (
          <>
            <line x1={activeCoord.x} y1={PAD_TOP} x2={activeCoord.x} y2={VIEW_H} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx={activeCoord.x} cy={activeCoord.y} r="3" fill="#EF4444" />
          </>
        )}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>{formatDateLabel(points[0].date)}</span>
        <span>{min.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        <span>{formatDateLabel(points[points.length - 1].date)}</span>
      </div>
      {active && (
        <div className="mt-2 inline-block rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white">
          {active.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} · {active.date}
        </div>
      )}
    </div>
  );
}
