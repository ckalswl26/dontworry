export function parseKRW(value: string): number {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

export function formatKRWInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
}

export function formatKRW(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
