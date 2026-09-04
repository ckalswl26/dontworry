import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl2 border border-gray-100 bg-white p-4 shadow-sm ${className}`}>{children}</div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl2 bg-brand-navy py-4 text-center font-semibold text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** 챗봇형 화면의 선택지 버튼. 자유 텍스트 재입력 대신 서버가 이미 아는 유효한
 * 선택지만 고르게 해서, 모호한 입력으로 인한 실패 가능성을 없앤다. */
export function QuickReplyButton({
  children,
  onClick,
  variant = "outline",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
}) {
  const variantStyle =
    variant === "primary"
      ? "bg-brand-navy text-white"
      : "border border-gray-200 text-brand-navy hover:border-brand-blue";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl2 py-3 text-center text-sm font-semibold disabled:opacity-40 ${variantStyle}`}
    >
      {children}
    </button>
  );
}

/** API 실패를 화면에 명확히 보여주기 위한 공용 에러 박스. 로딩 상태에 멈춘 채
 * 아무 표시도 없이 조용히 실패하는 걸 방지한다. */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl2 border border-red-200 bg-red-50 px-4 py-4 text-sm text-brand-red">
      데이터를 불러오지 못했어요: {message}
    </div>
  );
}

export function BackHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
      <button onClick={onBack} aria-label="back" className="text-xl text-brand-navy">
        ←
      </button>
      <h1 className="text-lg font-bold text-brand-navy">{title}</h1>
    </header>
  );
}
