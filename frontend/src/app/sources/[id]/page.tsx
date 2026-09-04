"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { BackHeader, Card } from "@/components/Card";
import { api } from "@/lib/api";

interface SourceDetail {
  source_id: string;
  organization: string;
  title: string;
  source_type: string;
  authority_grade: string;
  source_url?: string | null;
  status: string;
  effective_from?: string | null;
  effective_to?: string | null;
  data_as_of?: string | null;
  last_verified_at: string;
}

export default function SourceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { state } = useStore();
  const lang = state.profile.language;
  const [data, setData] = useState<SourceDetail | null>(null);

  useEffect(() => {
    api.source(params.id).then((d) => setData(d as SourceDetail));
  }, [params.id]);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title={t(lang, "sourceDetail")} onBack={() => router.back()} />

      <div className="flex-1 px-5 py-5">
        {data && (
          <Card>
            <p className="text-xs text-gray-400">{data.source_type}</p>
            <p className="mt-1 text-lg font-bold text-brand-navy">{data.title}</p>
            <p className="text-sm text-gray-500">{data.organization}</p>

            <div className="mt-4 divide-y divide-gray-100 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-gray-500">신뢰도 등급</span>
                <span className="font-semibold">{data.authority_grade}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">상태</span>
                <span className="font-semibold">{data.status}</span>
              </div>
              {data.data_as_of && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">기준 시점</span>
                  <span className="font-semibold">{data.data_as_of}</span>
                </div>
              )}
              {data.effective_to && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">종료일</span>
                  <span className="font-semibold text-brand-red">{data.effective_to}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-gray-500">최종 확인</span>
                <span className="font-semibold">{data.last_verified_at}</span>
              </div>
            </div>

            {data.source_url && (
              <a
                href={data.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block break-all text-sm text-brand-blue underline"
              >
                {data.source_url}
              </a>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
