"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { codeLabel, t } from "@/lib/i18n";
import { BackHeader, Card, ErrorNotice, PrimaryButton } from "@/components/Card";
import { BranchPicker } from "@/components/BranchPicker";
import { Dropdown } from "@/components/Dropdown";
import { LocalizedDateInput } from "@/components/LocalizedDateInput";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useApi";
import { shareOrCopy } from "@/lib/share";
import { renderTemplate } from "@/lib/renderTemplate";
import { INSTITUTION_TYPES, inferInstitutionType, institutionLabel, type InstitutionType } from "@/lib/institutionType";
import type { ConsultCardTranslateResponse, MultilingualBranch, RuleEvaluateResponse, TaskSignal } from "@/lib/types";

// 방문 기관 유형별로 가장 우선순위 높은 업무 하나를 고른다. 은행은 기존처럼
// account_closure(계좌 정리)를 최우선으로 두고, 그 외에는 신호가 급한 순(RED>AMBER>GREEN)으로 고른다.
function bestTaskForType(tasks: TaskSignal[], type: InstitutionType): TaskSignal | undefined {
  const matches = tasks.filter((task) => inferInstitutionType(task.responsible_org) === type);
  if (type === "BANK") {
    const accountClosure = matches.find((task) => task.task_id === "account_closure");
    if (accountClosure) return accountClosure;
  }
  return (
    matches.find((task) => task.signal === "RED") ??
    matches.find((task) => task.signal === "AMBER") ??
    matches.find((task) => task.signal === "GREEN") ??
    matches[0]
  );
}

function inferDefaultInstitutionType(tasks: TaskSignal[] | undefined, hasProduct: boolean): InstitutionType {
  if (hasProduct) return "BANK";
  const active = (tasks ?? []).filter((task) => task.signal !== "N/A");
  const urgent =
    active.find((task) => task.signal === "RED") ?? active.find((task) => task.signal === "AMBER") ?? active[0];
  return inferInstitutionType(urgent?.responsible_org) ?? "BANK";
}

// 은행 표준 영업시간(평일 09:00~16:00, 토/일 휴무)이 기준. 일요일 전용 영업점으로
// 확인된 지점(BranchPicker에서 표시)만 예외로 일요일 10:00~15:00을 추가로 연다.
function dayOperatingHours(dateStr: string, isSundayBranch: boolean): { open: string; close: string } | null {
  if (!dateStr) return null;
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  if (day === 0) return isSundayBranch ? { open: "10:00", close: "15:00" } : null;
  if (day === 6) return null;
  return { open: "09:00", close: "16:00" };
}

// 네이티브 시간 선택기(휠 스피너)는 영업시간 밖 값도 일단 스크롤로 골라지고 나서야
// 막혀서 사용자가 뭘 골라야 할지 알기 어렵다. 실제로 고를 수 있는 시간만 30분 간격으로
// 미리 만들어 목록으로 보여주면 헤매지 않는다.
function timeSlots(hours: { open: string; close: string }): string[] {
  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);
  const slots: string[] = [];
  for (let h = openH, m = openM; h < closeH || (h === closeH && m <= closeM); ) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  return slots;
}

function formatTimeLabel(lang: import("@/lib/types").Lang, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? t(lang, "amLabel") : t(lang, "pmLabel");
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${String(m).padStart(2, "0")}`;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
}

export default function ConsultCardPage() {
  const router = useRouter();
  const { state, setConsultation } = useStore();
  const lang = state.profile.language;
  const consultation = state.consultation;
  const [notice, setNotice] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [translation, setTranslation] = useState<ConsultCardTranslateResponse | null>(null);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const { data, loading, error } = useFetch<RuleEvaluateResponse>(
    () => api.rulesEvaluate({ profile: state.profile, documents_held: state.documentsHeld }), []
  );
  const { data: branchData } = useFetch<{ branches: MultilingualBranch[] }>(() => api.multilingualBranches(), []);
  const interpretationCenter = branchData?.branches.find((b) => b.branch_id === "KB_FOREIGN_CALL_CENTER");

  // 방문 기관 유형 자동 추론: 아직 선택 안 된 상태(최초 진입)에서만 데이터 로드 후 한 번 채워준다.
  // 사용자가 수동으로 바꾼 뒤에는 이 effect가 덮어쓰지 않는다(institutionType이 이미 채워져 있으므로).
  useEffect(() => {
    if (!data || consultation.institutionType) return;
    setConsultation({ institutionType: inferDefaultInstitutionType(data.tasks, Boolean(consultation.productName.trim())) });
  }, [data, consultation.institutionType, consultation.productName, setConsultation]);

  const institutionType = (consultation.institutionType || "BANK") as InstitutionType;

  const days = daysUntil(state.profile.departure_date);
  const visitTask = bestTaskForType(data?.tasks ?? [], institutionType);
  const requiredDocs = Array.from(new Set(visitTask?.required_documents ?? []));
  const heldDocs = requiredDocs.filter((doc) => state.documentsHeld.includes(doc));
  const missingDocs = requiredDocs.filter((doc) => !state.documentsHeld.includes(doc));
  const readiness = requiredDocs.length ? Math.round((heldDocs.length / requiredDocs.length) * 100) : 100;
  const operatingHours = dayOperatingHours(consultation.visitDate, consultation.branchIsSunday);
  const dateClosed = Boolean(consultation.visitDate) && operatingHours === null;
  const hasSchedule = Boolean(consultation.branch.trim() && consultation.visitDate && !dateClosed);
  const scheduleText = hasSchedule
    ? `${consultation.branch.trim()} ${t(lang, "scheduledVisitSuffix")} · ${consultation.visitDate}${consultation.visitTime ? ` ${consultation.visitTime}` : ""}`
    : t(lang, "enterScheduleMsg");
  const visitTimeLabels = state.profile.available_visit_time.map((code) => codeLabel(lang, code));
  const sourceText = visitTask?.sources.length
    ? visitTask.sources.map((source) => source.title).filter(Boolean).join(", ")
    : t(lang, "needToCheck");

  // 공유/복사 카드 내용은 한국 기관 창구 직원이 읽는 용도라 항상 한국어로 유지한다
  // (화면 UI 자체는 lang에 맞춰 번역하지만, 카드 본문은 F15 설계 원칙대로 한국어 고정).
  const scheduleTextKo = hasSchedule
    ? `${consultation.branch.trim()} 방문 예정 · ${consultation.visitDate}${consultation.visitTime ? ` ${consultation.visitTime}` : ""}`
    : "방문 일정을 입력해주세요";
  const shareText = [
    "[Don't ₩orry 사전상담 카드]", scheduleTextKo,
    `방문 목적: ${visitTask?.label ?? "확인 필요"}`,
    `출국 예정일: ${state.profile.departure_date ?? "미입력"}`,
    `서류 준비도: ${readiness}% (${missingDocs.length}개 부족)`,
    missingDocs.length ? `부족한 서류: ${missingDocs.map((doc) => codeLabel("ko", doc)).join(", ")}` : "필요 서류 준비 완료",
    consultation.productName.trim() ? `희망 상품: ${consultation.productName.trim()} (${consultation.productReasonKo.trim()})` : "",
    consultation.productName.trim() && state.profile.departure_date
      ? `요청사항: 만기를 ${state.profile.departure_date} 이전으로 설정 요청`
      : "",
    consultation.memo.trim() ? `상담 메모: ${consultation.memo.trim()}` : "",
  ].filter(Boolean).join("\n");

  const handleShare = async () => {
    try {
      const result = await shareOrCopy("Don't ₩orry 사전상담 카드", shareText);
      setNotice(result === "shared" ? t(lang, "shareOpenedMsg") : t(lang, "shareCopiedMsg"));
    } catch {
      // 공유 취소 - 조용히 무시
    }
  };

  // 카드에 이미 표시된 한국어 문구(방문목적/필요서류/판정근거)를 그대로 옮기기만 한다 -
  // 번역 과정에서 새 정보를 추가하지 않는다는 걸 백엔드 GUARD가 항목 개수로 다시 확인한다.
  const loadTranslation = async () => {
    if (translation) {
      setTranslationOpen((v) => !v);
      return;
    }
    setTranslationLoading(true);
    setTranslationError(null);
    try {
      const result = await api.consultCardTranslate({
        visit_purpose_ko: visitTask?.label ?? "확인 필요",
        required_documents_ko: requiredDocs.map((doc) => codeLabel("ko", doc)),
        judgement_basis_ko: sourceText,
        target_lang: lang,
      });
      setTranslation(result);
      setTranslationOpen(true);
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : String(err));
    } finally {
      setTranslationLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "consultCard")} onBack={() => router.back()} />
      <div className="flex-1 px-5 pb-8 pt-5">
        <Card className="border-brand-blue/15 bg-brand-sky/40">
          <p className="font-extrabold text-brand-navy">{t(lang, "consultInstitutionTypeTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t(lang, "consultInstitutionTypeDesc")}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {INSTITUTION_TYPES.map((it) => (
              <button
                key={it.value}
                type="button"
                onClick={() => setConsultation({ institutionType: it.value, branch: "", branchIsSunday: false, ready: false })}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  institutionType === it.value ? "bg-brand-navy text-white" : "border border-slate-200 bg-white text-slate-500"
                }`}
              >
                {t(lang, it.labelKey)}
              </button>
            ))}
          </div>
        </Card>

        <Card className="mt-3 border-brand-blue/15 bg-brand-sky/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-extrabold text-brand-navy">{t(lang, "consultScheduleTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {renderTemplate(t(lang, "consultScheduleDesc"), "{institution}", institutionLabel(lang, institutionType))}
              </p>
            </div>
            {hasSchedule && <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-blue">{t(lang, "inputDoneBadge")}</span>}
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="branch" className="text-xs font-semibold text-slate-600">
                  {institutionType === "BANK" ? t(lang, "consultBranchLabelBank") : t(lang, "consultBranchLabelGeneric")}
                </label>
                {institutionType === "BANK" && (
                  <button type="button" onClick={() => setPickerOpen((v) => !v)} className="text-xs font-semibold text-brand-blue">
                    {t(lang, "findBranchButton")}
                  </button>
                )}
              </div>
              <input
                id="branch"
                type="text"
                value={consultation.branch}
                onChange={(e) => setConsultation({ branch: e.target.value, branchIsSunday: false, ready: false })}
                placeholder={
                  institutionType === "BANK"
                    ? t(lang, "consultBranchPlaceholderBank")
                    : t(lang, "consultBranchPlaceholderGeneric").replace("{institution}", institutionLabel(lang, institutionType))
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-blue"
              />
              {institutionType === "BANK" && consultation.branch.trim() && (
                consultation.branchIsSunday ? (
                  <span className="mt-1.5 inline-block rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[11px] font-bold text-brand-navy">
                    ✓ {t(lang, "sundayBranchBadge")} {t(lang, "confirmedSuffix")}
                  </span>
                ) : (
                  <p className="mt-1.5 text-[11px] text-slate-400">{t(lang, "sundayBranchUnconfirmed")}</p>
                )
              )}
              {institutionType === "BANK" && pickerOpen && (
                <BranchPicker
                  lang={lang}
                  onSelect={(text, isSunday) => {
                    setConsultation({ branch: text, branchIsSunday: isSunday, ready: false });
                    setPickerOpen(false);
                  }}
                />
              )}
            </div>
            <div>
              <label htmlFor="visit-date" className="text-xs font-semibold text-slate-600">{t(lang, "consultVisitDateLabel")}</label>
              <LocalizedDateInput
                id="visit-date"
                lang={lang}
                value={consultation.visitDate}
                onChange={(newDate) => {
                  const newHours = dayOperatingHours(newDate, consultation.branchIsSunday);
                  const timeStillValid =
                    newHours && consultation.visitTime && consultation.visitTime >= newHours.open && consultation.visitTime <= newHours.close;
                  setConsultation({ visitDate: newDate, visitTime: timeStillValid ? consultation.visitTime : "", ready: false });
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">{t(lang, "consultVisitTimeLabel")} <span className="font-normal text-slate-400">{t(lang, "optionalLabel")}</span></label>
              {operatingHours ? (
                <div className="mt-1.5">
                  <Dropdown
                    value={consultation.visitTime}
                    onChange={(v) => setConsultation({ visitTime: v, ready: false })}
                    placeholder={t(lang, "timeSelectPlaceholder")}
                    options={timeSlots(operatingHours).map((slot) => ({ value: slot, label: formatTimeLabel(lang, slot) }))}
                  />
                </div>
              ) : (
                <p className="mt-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-300">
                  {t(lang, "selectDateFirst")}
                </p>
              )}
            </div>
            {dateClosed && (
              <p className="text-xs font-semibold text-brand-red">
                {t(lang, "dateNotBusinessDay")} {consultation.branchIsSunday ? t(lang, "chooseWeekdayOrSunday") : t(lang, "chooseWeekday")}
              </p>
            )}
            {operatingHours && (
              <p className="text-[11px] text-slate-400">
                {t(lang, "operatingHoursLabel").replace("{open}", operatingHours.open).replace("{close}", operatingHours.close)}
              </p>
            )}
          </div>
        </Card>

        {consultation.productName.trim() && (
          <Card className="mt-3 border-emerald-100 bg-emerald-50/40">
            <div className="flex items-start justify-between gap-3">
              <p className="font-extrabold text-brand-navy">{t(lang, "productConsultTitle")}</p>
              <button
                type="button"
                onClick={() => setConsultation({ productName: "", productReasonKo: "", productEligibilityBadgeKo: "" })}
                className="text-[11px] font-semibold text-slate-400 underline"
              >
                {t(lang, "clearLabel")}
              </button>
            </div>
            <p className="mt-2 text-sm font-bold text-brand-navy">{consultation.productName}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{consultation.productReasonKo}</p>

            {consultation.productEligibilityBadgeKo && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500">{t(lang, "metConditionsLabel")}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {consultation.productEligibilityBadgeKo.split(" · ").map((cond) => (
                    <span key={cond} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      ✓ {cond}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {state.profile.departure_date && (
              <div className="mt-3 rounded-xl bg-white px-3 py-2.5">
                <p className="text-xs font-semibold text-slate-500">{t(lang, "requestLabel")}</p>
                {/* 창구 직원이 화면으로 직접 읽는 요청 문구라 항상 한국어로 고정한다 (F15 설계 원칙과 동일). */}
                <p className="mt-1 text-sm font-bold text-brand-navy">
                  만기를 {state.profile.departure_date} 이전으로 설정 요청
                </p>
              </div>
            )}
          </Card>
        )}

        {interpretationCenter && (
          <Card className="mt-3 border-brand-blue/15 bg-brand-sky/30">
            <p className="text-xs font-semibold text-brand-blue">💬 {t(lang, "languageHelpTitle")}</p>
            <p className="mt-1 text-sm font-bold text-brand-navy">{interpretationCenter.branch_name}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {t(lang, "interpretationDesc").replace("{languages}", interpretationCenter.languages.join(" · "))}
            </p>
            <a
              href={`tel:${interpretationCenter.phone}`}
              className="mt-3 block w-full rounded-xl bg-brand-blue py-2.5 text-center text-sm font-bold text-white"
            >
              📞 {interpretationCenter.phone}
            </a>
          </Card>
        )}

        {loading && <p className="mt-4 text-sm text-gray-400">{t(lang, "consultLoadingMsg")}</p>}
        {!loading && error && <div className="mt-4"><ErrorNotice message={error} /></div>}
        {!loading && !error && <>
          <Card className="mt-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-white">{state.profile.nationality.slice(0, 1)}</div><div className="min-w-0"><p className="font-bold text-brand-navy">{state.profile.nationality} · {state.profile.visa_type}</p><p className={`mt-1 text-xs font-semibold ${hasSchedule ? "text-brand-blue" : "text-slate-500"}`}>{scheduleText}{consultation.branchIsSunday && ` · ${t(lang, "sundayBranchBadge")}`}</p><p className="mt-1 text-xs text-slate-500">{days === null ? t(lang, "departureDateNotSet") : `${t(lang, "daysToDeparture")} D-${days}`}</p>{visitTimeLabels.length > 0 && <p className="mt-1 text-xs text-slate-500">{t(lang, "visitTime")}: {visitTimeLabels.join(", ")}</p>}</div></div></Card>
          <Card className="mt-3"><div className="flex items-center justify-between gap-4"><span className="text-sm text-gray-500">{t(lang, "visitPurpose")}</span><span className="text-right font-semibold text-brand-red">{visitTask?.label ?? t(lang, "needToCheck")}</span></div><div className="mt-3 flex items-center justify-between"><span className="text-sm text-gray-500">{t(lang, "readiness")}</span><span className="font-bold">{readiness}% ({missingDocs.length}{t(lang, "missingCount")})</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-blue" style={{ width: `${readiness}%` }} /></div></Card>
          {missingDocs.length > 0 && <Card className="mt-3"><p className="text-sm font-semibold text-gray-500">{t(lang, "insufficientDocs")}</p><ul className="mt-2 space-y-1.5 text-sm text-brand-red">{missingDocs.map((doc) => <li key={doc} className="flex gap-2"><span>•</span><span>{codeLabel(lang, doc)}</span></li>)}</ul></Card>}
          <Card className="mt-3"><p className="text-xs font-semibold text-gray-400">{t(lang, "judgementBasis")}</p><p className={`mt-1 text-sm ${sourceText === t(lang, "needToCheck") ? "font-semibold text-amber-700" : "text-gray-600"}`}>{sourceText}</p></Card>

          {lang !== "ko" && (
            <Card className="mt-3">
              <button type="button" onClick={loadTranslation} className="flex w-full items-center justify-between" disabled={translationLoading}>
                <span className="text-sm font-bold text-brand-navy">🌐 {t(lang, "viewInMyLangTitle")}</span>
                <span className="text-xs font-semibold text-brand-blue">
                  {translationLoading ? "..." : translationOpen ? t(lang, "collapseLabel") : t(lang, "expandLabel")}
                </span>
              </button>
              {translationError && <p className="mt-2 text-xs text-brand-red">{t(lang, "translationFailedMsg")}</p>}
              {translationOpen && translation && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  {!translation.translated && (
                    <p className="text-[11px] font-semibold text-amber-600">
                      {t(lang, "translationFallbackMsg")}
                    </p>
                  )}
                  <div>
                    <p className="text-xs text-slate-400">{t(lang, "visitPurpose")}</p>
                    <p className="mt-0.5 text-sm font-semibold text-brand-navy">{translation.visit_purpose}</p>
                  </div>
                  {translation.required_documents.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400">{t(lang, "insufficientDocs")}</p>
                      <ul className="mt-0.5 space-y-1 text-sm text-slate-600">
                        {translation.required_documents.map((doc, i) => (
                          <li key={i}>• {doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400">{t(lang, "judgementBasis")}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{translation.judgement_basis}</p>
                  </div>
                </div>
              )}
            </Card>
          )}

          <div className="mt-4"><label htmlFor="consult-memo" className="text-sm font-semibold text-gray-500">{t(lang, "consultMemo")}</label><textarea id="consult-memo" value={consultation.memo} onChange={(e) => setConsultation({ memo: e.target.value, ready: false })} placeholder={t(lang, "consultMemoPlaceholder")} className="mt-2 h-28 w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-blue" /></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={handleShare} className="rounded-xl2 border border-brand-blue py-3 text-sm font-bold text-brand-blue">{t(lang, "shareLabel")}</button><PrimaryButton disabled={!hasSchedule} onClick={() => { setConsultation({ ready: true }); setNotice(t(lang, "consultSavedNotice")); }}>{t(lang, "consultReadyBadge")}</PrimaryButton></div>
          {!hasSchedule && <p className="mt-2 text-right text-[11px] font-medium text-slate-400">{t(lang, "needScheduleHint").replace("{institution}", institutionLabel(lang, institutionType))}</p>}
          {notice && <p role="status" className="mt-3 rounded-xl bg-brand-sky px-3 py-2 text-center text-xs font-semibold text-brand-navy">{notice}</p>}
          <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">{t(lang, "consultPrivacyNote")}</p>
        </>}
      </div>
    </div>
  );
}
