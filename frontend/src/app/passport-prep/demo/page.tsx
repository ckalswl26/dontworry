"use client";

/**
 * ⚠️ 이 화면은 "전자여권 사전 확인 (데모)" 연출용 시퀀스다. 실제 NFC/생체인증/본인확인을
 * 절대 수행하지 않으며 어떤 네트워크 요청도 만들지 않는다 - 관련 인프라(부처간 연계 등)가
 * 갖춰지면 어떤 흐름이 될 수 있을지 보여주는 시뮬레이션일 뿐이다.
 * "인증 완료"/"본인확인 완료" 같은 표현은 절대 쓰지 않는다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { BackHeader, Card, PrimaryButton } from "@/components/Card";
import { MockEpassportSequence } from "@/components/MockEpassportSequence";

type Phase = "confirm" | "sequence" | "result";

export default function EpassportPreCheckDemoPage() {
  const router = useRouter();
  const { state } = useStore();
  const prep = state.passportPrep;
  const [phase, setPhase] = useState<Phase>("confirm");

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="전자여권 사전 확인 (데모)" onBack={() => router.back()} />
      <div className="flex-1 px-5 py-5">
        {phase === "confirm" && (
          <>
            <Card className="border-brand-blue/15 bg-brand-sky/40">
              <p className="text-sm leading-6 text-slate-600">
                실제 본인인증이 아니에요. 앞으로 전자여권 인증 인프라가 갖춰지면 어떤 흐름이 될 수 있는지 미리
                보여드리는 데모예요.
              </p>
            </Card>

            <Card className="mt-3">
              <p className="mb-2 text-sm font-bold text-brand-navy">확인할 여권 정보</p>
              <div className="flex flex-col gap-1.5 text-sm text-slate-700">
                <p>
                  영문 성명: <span className="font-semibold">{prep.englishName || "미입력"}</span>
                </p>
                <p>
                  여권번호: <span className="font-semibold">{prep.passportNumber || "미입력"}</span>
                </p>
                <p>
                  여권 만료일: <span className="font-semibold">{prep.passportExpiry || "미입력"}</span>
                </p>
              </div>
            </Card>

            <div className="mt-5">
              <PrimaryButton onClick={() => setPhase("sequence")}>전자여권 사전 확인 시작하기 (데모)</PrimaryButton>
            </div>
          </>
        )}

        {phase === "sequence" && (
          <Card>
            <p className="mb-3 text-xs font-semibold text-slate-400">데모 시뮬레이션 진행 중</p>
            <MockEpassportSequence onComplete={() => setPhase("result")} />
          </Card>
        )}

        {phase === "result" && (
          <>
            <Card className="text-center">
              <p className="text-xl font-black text-brand-navy">전자여권 사전 확인 완료 (데모)</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                이건 데모 시뮬레이션입니다. 최종 본인확인은 반드시 해당 금융회사에서 진행됩니다.
              </p>
            </Card>

            <div className="mt-5">
              <PrimaryButton onClick={() => router.push("/finance")}>지원 은행 확인하기</PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
