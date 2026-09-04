import Image from "next/image";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt="돈워리 원형 로고"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
      priority
    />
  );
}

export function LogoWordmark({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/brand/logo-wordmark.png"
      alt="돈워리 워드마크"
      width={height * 3.2}
      height={height}
      style={{ height, width: "auto" }}
      className={className}
      priority
    />
  );
}

export function Mascot({ className = "", size = 48 }: { className?: string; size?: number }) {
  return <Image src="/brand/mascot.png" alt="돈워리 마스코트" width={size} height={size} className={className} />;
}
