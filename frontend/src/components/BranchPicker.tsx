"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { Dropdown } from "@/components/Dropdown";
import type { BranchLocation, Lang } from "@/lib/types";

function formatDistance(m: number | null | undefined): string {
  if (m === null || m === undefined) return "";
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

export function BranchPicker({
  lang,
  onSelect,
}: {
  lang: Lang;
  onSelect: (branchText: string, isSunday: boolean) => void;
}) {
  const [banks, setBanks] = useState<string[]>([]);
  const [bank, setBank] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BranchLocation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    api.bankList().then((r) => setBanks(r.banks)).catch(() => setBanks([]));
  }, []);

  useEffect(() => {
    if (!bank || !query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .branchSearch(bank, query.trim())
        .then((res) => {
          if (!res.available) {
            setError(res.error || t(lang, "branchSearchUnavailable"));
            setResults([]);
          } else {
            setResults(res.branches);
          }
        })
        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [bank, query, lang]);

  const findNearby = () => {
    if (!navigator.geolocation) {
      setError(t(lang, "geoErrorMessage"));
      return;
    }
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        api
          .nearbyBanks(pos.coords.latitude, pos.coords.longitude)
          .then((res) => {
            if (!res.available) {
              setError(res.error || t(lang, "branchSearchUnavailable"));
              setResults([]);
              return;
            }
            const filtered = bank ? res.branches.filter((b) => b.bank === bank) : res.branches;
            setResults(filtered);
          })
          .catch((err) => setError(err instanceof Error ? err.message : String(err)))
          .finally(() => setGeoLoading(false));
      },
      () => {
        setError(t(lang, "geoErrorMessage"));
        setGeoLoading(false);
      }
    );
  };

  const select = (branch: BranchLocation) => {
    onSelect(branch.place_name, branch.sunday_branch);
    setResults(null);
    setQuery("");
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <Dropdown
        value={bank}
        onChange={setBank}
        options={banks.map((b) => ({ value: b, label: b }))}
        placeholder={t(lang, "bankSelectPlaceholder")}
      />

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!bank}
          placeholder={t(lang, "branchSearchPlaceholder")}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-blue disabled:opacity-50"
        />
        <button
          type="button"
          onClick={findNearby}
          disabled={geoLoading}
          className="shrink-0 rounded-xl border border-brand-blue px-3 py-2.5 text-xs font-semibold text-brand-blue disabled:opacity-50"
        >
          {geoLoading ? "..." : t(lang, "findNearbyBank")}
        </button>
      </div>

      {loading && <p className="mt-2 text-xs text-gray-400">...</p>}
      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}

      {results && !loading && (
        <div className="mt-2 flex flex-col gap-1.5">
          {results.length === 0 && !error && <p className="text-xs text-gray-400">{t(lang, "noBranchResults")}</p>}
          {results.slice(0, 8).map((branch, idx) => (
            <button
              key={`${branch.place_name}-${idx}`}
              type="button"
              onClick={() => select(branch)}
              className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-left text-xs shadow-sm hover:border-brand-blue"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-brand-navy">{branch.place_name}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {branch.sunday_branch && (
                    <span className="rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[10px] font-bold text-brand-navy">
                      {t(lang, "sundayBranchBadge")}
                    </span>
                  )}
                  {branch.distance_m !== null && branch.distance_m !== undefined && (
                    <span className="text-[10px] text-gray-400">{formatDistance(branch.distance_m)}</span>
                  )}
                </div>
              </div>
              <p className="mt-0.5 text-gray-500">{branch.road_address || branch.address}</p>
            </button>
          ))}
          <p className="mt-1 text-[10px] text-gray-300">이 서비스는 카카오맵의 API를 이용하고 있습니다.</p>
        </div>
      )}
    </div>
  );
}
