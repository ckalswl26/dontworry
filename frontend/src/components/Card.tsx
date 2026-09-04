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
