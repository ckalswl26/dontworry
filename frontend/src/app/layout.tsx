import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { OfflineBanner } from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "Don't ₩orry · 돈워리",
  description: "외국인 근로자를 위한 출국 준비 금융·행정 안내 서비스",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111C4E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <StoreProvider>
          <OfflineBanner />
          <div className="app-shell">{children}</div>
        </StoreProvider>
      </body>
    </html>
  );
}
