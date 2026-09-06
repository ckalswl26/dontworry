"use client";

/**
 * ⚠️ 데모 연출 전용 컴포넌트 - 실제 인증 로직이 아니다.
 * NFC/생체인증/서버 API를 절대 호출하지 않고, setTimeout 기반 타이머로만 단계를
 * 진행시키는 시뮬레이션이다. 카메라 접근도 하지 않는다(아이콘 애니메이션으로만 연출).
 * 3단계(국내 체류정보 확인)는 법무부 연계 없이는 실제로 확인할 수 없는 부분이라,
 * 절대 "확인됨"으로 표시하지 않고 한계를 그대로 인정하는 문구를 보여준다.
 */

import { useEffect, useState } from "react";

type StepStatus = "pending" | "running" | "done" | "unavailable";

interface StepState {
  signature: StepStatus;
  face: StepStatus;
  residency: StepStatus;
}

const INITIAL: StepState = { signature: "pending", face: "pending", residency: "pending" };

export function MockEpassportSequence({ onComplete }: { onComplete: () => void }) {
  const [steps, setSteps] = useState<StepState>(INITIAL);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, delayMs: number) => timers.push(setTimeout(fn, delayMs));

    schedule(() => setSteps((s) => ({ ...s, signature: "running" })), 200);
    schedule(() => setSteps((s) => ({ ...s, signature: "done" })), 1800);

    schedule(() => setSteps((s) => ({ ...s, face: "running" })), 2000);
    schedule(() => setSteps((s) => ({ ...s, face: "done" })), 3800);

    schedule(() => setSteps((s) => ({ ...s, residency: "running" })), 4000);
    schedule(() => setSteps((s) => ({ ...s, residency: "unavailable" })), 5600);

    schedule(onComplete, 6600);

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <SequenceRow icon="🛂" label="① 전자여권 전자서명 확인 중..." status={steps.signature} doneText="확인됨 (시뮬레이션)" />
      <SequenceRow icon="🧑" label="② 얼굴 정보 대조 중..." status={steps.face} doneText="확인됨 (시뮬레이션)" />
      <SequenceRow
        icon="🏛️"
        label="③ 국내 체류정보 확인 중..."
        status={steps.residency}
        unavailableText="실제 서비스에서는 법무부 체류정보 연계가 필요합니다"
      />
    </div>
  );
}

function SequenceRow({
  icon,
  label,
  status,
  doneText,
  unavailableText,
}: {
  icon: string;
  label: string;
  status: StepStatus;
  doneText?: string;
  unavailableText?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center gap-3">
        <span className={`text-2xl ${status === "running" ? "animate-pulse" : ""}`} aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-navy">{label}</p>
          {status === "running" && <p className="mt-0.5 text-xs text-slate-400">처리 중...</p>}
          {status === "done" && doneText && <p className="mt-0.5 text-xs font-bold text-emerald-600">✓ {doneText}</p>}
          {status === "unavailable" && unavailableText && (
            <p className="mt-0.5 text-xs font-bold text-amber-600">△ {unavailableText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
