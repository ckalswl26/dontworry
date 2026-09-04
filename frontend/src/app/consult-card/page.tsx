"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { codeLabel, t } from "@/lib/i18n";
import { BackHeader, Card, ErrorNotice, PrimaryButton } from "@/components/Card";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import type { RuleEvaluateResponse } from "@/lib/types";

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

export default function ConsultCardPage() {
  const router = useRouter();
  const { state, setConsultation } = useStore();
  const lang = state.profile.language;
  const consultation = state.consultation;
  const [notice, setNotice] = useState("");
  const { data, loading, error } = useFetch<RuleEvaluateResponse>(
    () => api.rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld }), []
  );

  const days = daysUntil(state.profile.departure_date);
  const visitTask = data?.tasks.find((task) => task.task_id === "account_closure")
    ?? data?.tasks.find((task) => task.channel === "BRANCH_VISIT" && task.signal === "RED");
  const requiredDocs = Array.from(new Set(visitTask?.required_documents ?? []));
  const heldDocs = requiredDocs.filter((doc) => state.documentsHeld.includes(doc));
  const missingDocs = requiredDocs.filter((doc) => !state.documentsHeld.includes(doc));
  const readiness = requiredDocs.length ? Math.round((heldDocs.length / requiredDocs.length) * 100) : 100;
  const hasSchedule = Boolean(consultation.branch.trim() && consultation.visitDate);
  const scheduleText = hasSchedule
    ? `${consultation.branch.trim()} 방문 예정 · ${consultation.visitDate}${consultation.visitTime ? ` ${consultation.visitTime}` : ""}`
    : "방문 일정을 입력해주세요";
  const visitTimeLabels = state.profile.available_visit_time.map((code) => codeLabel(lang, code));
  const sourceText = visitTask?.sources.length
    ? visitTask.sources.map((source) => source.title).filter(Boolean).join(", ")
    : "확인 필요";
  const shareText = [
    "[Don't ₩orry 사전상담 카드]", scheduleText,
    `방문 목적: ${visitTask?.label ?? "확인 필요"}`,
    `출국 예정일: ${state.profile.departure_date ?? "미입력"}`,
    `서류 준비도: ${readiness}% (${missingDocs.length}개 부족)`,
    missingDocs.length ? `부족한 서류: ${missingDocs.map((doc) => codeLabel(lang, doc)).join(", ")}` : "필요 서류 준비 완료",
    consultation.memo.trim() ? `상담 메모: ${consultation.memo.trim()}` : "",
  ].filter(Boolean).join("\n");

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Don't ₩orry 사전상담 카드", text: shareText });
        setNotice("공유 화면을 열었어요.");
      } else {
        await copyToClipboard(shareText);
        setNotice("카드 내용이 복사되었습니다.");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      await copyToClipboard(shareText);
      setNotice("카드 내용이 복사되었습니다.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "consultCard")} onBack={() => router.back()} />
      <div className="flex-1 px-5 pb-8 pt-5">
        <Card className="border-brand-blue/15 bg-brand-sky/40">
          <div className="flex items-start justify-between gap-3"><div><p className="font-extrabold text-brand-navy">방문 예약 정보</p><p className="mt-1 text-xs leading-5 text-slate-500">예약한 은행과 방문 일정을 직접 입력해주세요.</p></div>{hasSchedule && <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-blue">입력 완료</span>}</div>
          <div className="mt-4 space-y-3">
            <div><label htmlFor="branch" className="text-xs font-semibold text-slate-600">방문 은행/지점명</label><input id="branch" type="text" value={consultation.branch} onChange={(e) => setConsultation({ branch: e.target.value, ready: false })} placeholder="예: OO은행 OO지점" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-blue" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="visit-date" className="text-xs font-semibold text-slate-600">방문 예정 날짜</label><input id="visit-date" type="date" value={consultation.visitDate} onChange={(e) => setConsultation({ visitDate: e.target.value, ready: false })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-brand-blue" /></div>
              <div><label htmlFor="visit-time" className="text-xs font-semibold text-slate-600">방문 시간 <span className="font-normal text-slate-400">선택</span></label><input id="visit-time" type="time" value={consultation.visitTime} onChange={(e) => setConsultation({ visitTime: e.target.value, ready: false })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-brand-blue" /></div>
            </div>
          </div>
        </Card>

        {loading && <p className="mt-4 text-sm text-gray-400">상담 정보를 확인하고 있어요...</p>}
        {!loading && error && <div className="mt-4"><ErrorNotice message={error} /></div>}
        {!loading && !error && <>
          <Card className="mt-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-white">{state.profile.nationality.slice(0, 1)}</div><div className="min-w-0"><p className="font-bold text-brand-navy">{state.profile.nationality} · {state.profile.visa_type}</p><p className={`mt-1 text-xs font-semibold ${hasSchedule ? "text-brand-blue" : "text-slate-500"}`}>{scheduleText}</p><p className="mt-1 text-xs text-slate-500">{days === null ? "출국예정일 미입력" : `출국 예정일까지 D-${days}`}</p>{visitTimeLabels.length > 0 && <p className="mt-1 text-xs text-slate-500">방문 가능 시간: {visitTimeLabels.join(", ")}</p>}</div></div></Card>
          <Card className="mt-3"><div className="flex items-center justify-between gap-4"><span className="text-sm text-gray-500">{t(lang, "visitPurpose")}</span><span className="text-right font-semibold text-brand-red">{visitTask?.label ?? "확인 필요"}</span></div><div className="mt-3 flex items-center justify-between"><span className="text-sm text-gray-500">{t(lang, "readiness")}</span><span className="font-bold">{readiness}% ({missingDocs.length}{t(lang, "missingCount")})</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-blue" style={{ width: `${readiness}%` }} /></div></Card>
          {missingDocs.length > 0 && <Card className="mt-3"><p className="text-sm font-semibold text-gray-500">{t(lang, "insufficientDocs")}</p><ul className="mt-2 space-y-1.5 text-sm text-brand-red">{missingDocs.map((doc) => <li key={doc} className="flex gap-2"><span>•</span><span>{codeLabel(lang, doc)}</span></li>)}</ul></Card>}
          <Card className="mt-3"><p className="text-xs font-semibold text-gray-400">{t(lang, "judgementBasis")}</p><p className={`mt-1 text-sm ${sourceText === "확인 필요" ? "font-semibold text-amber-700" : "text-gray-600"}`}>{sourceText}</p></Card>
          <div className="mt-4"><label htmlFor="consult-memo" className="text-sm font-semibold text-gray-500">{t(lang, "consultMemo")}</label><textarea id="consult-memo" value={consultation.memo} onChange={(e) => setConsultation({ memo: e.target.value, ready: false })} placeholder="상담 시 확인할 내용을 적어주세요. 이 기기에만 임시 저장됩니다." className="mt-2 h-28 w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-blue" /></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={handleShare} className="rounded-xl2 border border-brand-blue py-3 text-sm font-bold text-brand-blue">공유하기</button><PrimaryButton onClick={() => { setConsultation({ ready: true }); setNotice("이 기기에 상담 준비 완료로 저장했어요."); }}>상담 준비 완료</PrimaryButton></div>
          {notice && <p role="status" className="mt-3 rounded-xl bg-brand-sky px-3 py-2 text-center text-xs font-semibold text-brand-navy">{notice}</p>}
          <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">은행 시스템으로 전송되지 않으며, 준비 상태와 메모는 이 기기에만 임시 저장됩니다.</p>
        </>}
      </div>
    </div>
  );
}
