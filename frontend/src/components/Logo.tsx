import Image from "next/image";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/logo-mark.png"
      alt="Don't Worry"
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
      src="/logo-wordmark.png"
      alt="Don't Worry"
      width={height * 3.2}
      height={height}
      style={{ height, width: "auto" }}
      className={className}
      priority
    />
  );
}
