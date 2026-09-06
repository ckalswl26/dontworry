"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { BackHeader, Card } from "@/components/Card";
import { shareOrCopy } from "@/lib/share";

export default function PassportPrepPage() {
  const router = useRouter();
  const { state, setPassportPrep } = useStore();
  const prep = state.passportPrep;
  const [notice, setNotice] = useState("");

  // 온보딩/내 정보에서 이미 입력한 이름이 있으면 한 번만 미리 채워준다 (재입력 방지).
  useEffect(() => {
    if (!prep.englishName && state.profile.name) {
      setPassportPrep({ englishName: state.profile.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAnyInfo = Boolean(
    prep.englishName.trim() || prep.passportNumber.trim() || prep.passportExpiry || prep.address.trim() || prep.phone.trim()
  );

  const summaryText = [
    "[비대면 계좌개설 준비 정보]",
    prep.englishName.trim() ? `영문 성명: ${prep.englishName.trim()}` : "",
    prep.passportNumber.trim() ? `여권번호: ${prep.passportNumber.trim()}` : "",
    prep.passportExpiry ? `여권 만료일: ${prep.passportExpiry}` : "",
    prep.address.trim() ? `국내 체류지 주소: ${prep.address.trim()}` : "",
    prep.phone.trim() ? `연락처: ${prep.phone.trim()}` : "",
    "",
    "※ 이 정보는 은행 앱/웹사이트에 본인이 직접 입력해야 하며, Don't ₩orry가 대신 제출하지 않습니다.",
  ].filter(Boolean).join("\n");

  const handleShare = async () => {
    try {
      const result = await shareOrCopy("비대면 계좌개설 준비 정보", summaryText);
      setNotice(result === "shared" ? "공유 화면을 열었어요." : "내용이 복사되었습니다.");
    } catch {
      // 공유 취소 - 조용히 무시
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="비대면 계좌개설 준비" onBack={() => router.back()} />
      <div className="flex-1 px-5 py-5">
        <Card className="border-brand-blue/15 bg-brand-sky/40">
          <p className="text-sm leading-6 text-slate-600">
            은행 앱에서 여권 기반 비대면 계좌개설을 신청할 때 빠르게 입력할 수 있도록, 필요한 정보를 미리 정리해두는
            도우미예요. 저희가 본인인증이나 계좌개설을 대신 해드리는 건 아니에요.
          </p>
        </Card>

        <Card className="mt-3">
          <p className="mb-3 text-sm font-bold text-brand-navy">여권 정보</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">영문 성명 (여권 표기와 동일하게)</label>
              <input
                type="text"
                value={prep.englishName}
                onChange={(e) => setPassportPrep({ englishName: e.target.value })}
                placeholder="예: NGUYEN VAN A"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">여권번호</label>
              <input
                type="text"
                value={prep.passportNumber}
                onChange={(e) => setPassportPrep({ passportNumber: e.target.value })}
                placeholder="예: M12345678"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">여권 만료일</label>
              <input
                type="date"
                value={prep.passportExpiry}
                onChange={(e) => setPassportPrep({ passportExpiry: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">국내 체류지 주소</label>
              <input
                type="text"
                value={prep.address}
                onChange={(e) => setPassportPrep({ address: e.target.value })}
                placeholder="예: 경기도 안산시 단원구 ..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">연락처</label>
              <input
                type="tel"
                value={prep.phone}
                onChange={(e) => setPassportPrep({ phone: e.target.value })}
                placeholder="예: 010-1234-5678"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-brand-blue"
              />
            </div>
          </div>
        </Card>

        {hasAnyInfo && (
          <Card className="mt-3">
            <p className="mb-2 text-sm font-bold text-brand-navy">준비 완료 카드</p>
            <div className="flex flex-col gap-1.5 text-sm text-slate-700">
              {prep.englishName.trim() && <p>영문 성명: <span className="font-semibold">{prep.englishName.trim()}</span></p>}
              {prep.passportNumber.trim() && <p>여권번호: <span className="font-semibold">{prep.passportNumber.trim()}</span></p>}
              {prep.passportExpiry && <p>여권 만료일: <span className="font-semibold">{prep.passportExpiry}</span></p>}
              {prep.address.trim() && <p>국내 체류지 주소: <span className="font-semibold">{prep.address.trim()}</span></p>}
              {prep.phone.trim() && <p>연락처: <span className="font-semibold">{prep.phone.trim()}</span></p>}
            </div>

            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-700">
              ⚠ 이 정보는 은행 앱/웹사이트 자체 절차에서 본인이 직접 입력해야 하며, Don&apos;t ₩orry가 대신 제출하지
              않습니다.
            </p>

            <button
              type="button"
              onClick={handleShare}
              className="mt-3 w-full rounded-xl2 border border-brand-blue py-2.5 text-sm font-bold text-brand-blue"
            >
              공유하기
            </button>
            {notice && (
              <p role="status" className="mt-2 rounded-xl bg-brand-sky px-3 py-2 text-center text-xs font-semibold text-brand-navy">
                {notice}
              </p>
            )}
          </Card>
        )}

        <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
          입력한 정보는 이 기기에만 저장되며, 서버로 전송되지 않습니다.
        </p>
      </div>
    </div>
  );
}
