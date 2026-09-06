"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { SessionState } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card } from "@/components/Card";
import { BottomNav } from "@/components/BottomNav";
import { Dropdown } from "@/components/Dropdown";
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { LANGS } from "@/lib/languages";
import { AUTO_TRANSLATED_LANGS, type Lang } from "@/lib/types";

export default function MyPage() {
  const router = useRouter();
  const { state, setLang, reset, restoreState } = useStore();
  const lang = state.profile.language;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupNotice, setBackupNotice] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNotice, setPushNotice] = useState("");

  useEffect(() => {
    getExistingSubscription().then((sub) => setPushEnabled(Boolean(sub)));
  }, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dontworry-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Partial<SessionState>;
        restoreState(data);
        setBackupNotice("불러오기 완료했어요.");
      } catch {
        setBackupNotice("파일을 읽지 못했어요. 이 앱에서 내보낸 백업 파일인지 확인해주세요.");
      }
    };
    reader.readAsText(file);
  };

  const togglePush = async () => {
    setPushBusy(true);
    setPushNotice("");
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const ok = await subscribeToPush(state.profile.departure_date ?? null, lang);
        setPushEnabled(ok);
        if (!ok) setPushNotice("알림을 켤 수 없어요. 브라우저 알림 권한을 확인해주세요.");
      }
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "myTitle")} onBack={() => router.back()} />

      <div className="flex-1 px-5 pb-28 pt-6">
        <div className="mb-5">
          <h2 className="text-xl font-black tracking-tight text-brand-navy">
            {lang === "ko" ? "내 정보를 관리해요" : lang === "vi" ? "Quản lý thông tin" : "Manage your information"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {lang === "ko" ? "맞춤 금융 안내에 필요한 기본 정보예요." : lang === "vi" ? "Thông tin cơ bản cho hướng dẫn tài chính phù hợp." : "Basic details used for personalized financial guidance."}
          </p>
        </div>

        <Card className="!p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <div><p className="text-sm font-extrabold text-brand-navy">프로필</p><p className="mt-0.5 text-[11px] text-slate-400">맞춤 안내에 사용하는 정보</p></div>
            <button type="button" onClick={() => router.push("/my/edit")} className="rounded-full bg-brand-sky px-3 py-1.5 text-xs font-bold text-brand-blue">수정</button>
          </div>
          <div className="mx-5 border-t border-slate-100" />
          <div className="flex min-h-[58px] items-center justify-between gap-4 px-5 py-3">
            <span className="shrink-0 text-sm font-semibold text-slate-500">{t(lang, "nameLabel")}</span>
            <span className="text-sm font-bold text-brand-navy">{state.profile.name || "미입력"}</span>
          </div>
          <div className="mx-5 border-t border-slate-100" />
          <div className="flex min-h-[58px] items-center justify-between px-5 py-3">
            <span className="text-sm font-semibold text-slate-500">{t(lang, "nationality")}</span>
            <span className="rounded-lg bg-brand-sky px-3 py-1.5 text-sm font-bold text-brand-navy">{state.profile.nationality}</span>
          </div>
          <div className="mx-5 border-t border-slate-100" />
          <div className="flex min-h-[58px] items-center justify-between px-5 py-3">
            <span className="text-sm font-semibold text-slate-500">{t(lang, "visaType")}</span>
            <span className="rounded-lg bg-brand-cream px-3 py-1.5 text-sm font-bold text-brand-navy">{state.profile.visa_type}</span>
          </div>
          <div className="mx-5 border-t border-slate-100" />
          <div className="flex min-h-[58px] items-center justify-between gap-4 px-5 py-3">
            <span className="shrink-0 text-sm font-semibold text-slate-500">{t(lang, "departureDate")}</span>
            <span className="text-sm font-bold text-brand-navy">{state.profile.departure_date || "미입력"}</span>
          </div>
        </Card>

        <Card className="mt-4">
          <p className="mb-3 text-sm font-bold text-brand-navy">{t(lang, "langSelect")}</p>
          <Dropdown
            value={lang}
            onChange={(code) => setLang(code as Lang)}
            options={LANGS.map((l) => ({ value: l.code, label: `${l.greeting} · ${l.label}` }))}
          />
          {AUTO_TRANSLATED_LANGS.includes(lang) && (
            <p className="mt-1.5 text-[11px] text-amber-600">⚠ 자동번역 - 오류가 있을 수 있어요</p>
          )}
        </Card>

        {isPushSupported() && (
          <Card className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-brand-navy">출국 준비 알림</p>
                <p className="mt-0.5 text-[11px] text-slate-400">D-14 방문 준비, 출국일에 알려드려요.</p>
              </div>
              <button
                type="button"
                onClick={togglePush}
                disabled={pushBusy}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50 ${
                  pushEnabled ? "bg-brand-navy text-white" : "border border-brand-blue text-brand-blue"
                }`}
              >
                {pushEnabled ? "알림 켜짐" : "알림 받기"}
              </button>
            </div>
            {pushNotice && <p className="mt-2 text-[11px] text-brand-red">{pushNotice}</p>}
          </Card>
        )}

        <Card className="mt-4">
          <p className="text-sm font-bold text-brand-navy">내 정보 백업</p>
          <p className="mt-0.5 text-[11px] text-slate-400">기기를 바꾸거나 브라우저 데이터가 지워져도 복원할 수 있어요.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={handleExport} className="rounded-xl border border-brand-blue py-2.5 text-xs font-bold text-brand-blue">
              내보내기
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-500">
              불러오기
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          {backupNotice && <p className="mt-2 text-[11px] text-slate-500">{backupNotice}</p>}
        </Card>

        <button
          onClick={() => router.push("/consult-card")}
          className="mt-4 flex w-full items-center justify-between rounded-xl2 border border-brand-blue/20 bg-brand-sky px-5 py-4 text-left text-sm font-bold text-brand-navy shadow-sm"
        >
          <span><span className="mr-2">🏦</span>{t(lang, "consultCard")}</span><span className="text-brand-blue">›</span>
        </button>

        <button
          onClick={() => router.push("/passport-prep")}
          className="mt-3 flex w-full items-center justify-between rounded-xl2 border border-brand-blue/20 bg-brand-sky px-5 py-4 text-left text-sm font-bold text-brand-navy shadow-sm"
        >
          <span><span className="mr-2">📝</span>비대면 계좌개설 준비</span><span className="text-brand-blue">›</span>
        </button>

        <button
          onClick={() => {
            reset();
            router.push("/");
          }}
          className="mx-auto mt-5 block px-4 py-2 text-xs font-semibold text-slate-400 underline decoration-slate-300 underline-offset-4"
        >
          {lang === "ko" ? "정보 초기화" : lang === "vi" ? "Đặt lại thông tin" : "Reset info"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
