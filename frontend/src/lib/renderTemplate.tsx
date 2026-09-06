import type { ReactNode } from "react";

// 번역 문구 안의 {placeholder} 자리에만 JSX(예: 굵게 표시한 숫자)를 끼워 넣는다.
// 문구의 앞/뒤 부분은 각 언어 번역 그대로 두고, 그 사이에 동적 값만 삽입한다.
export function renderTemplate(template: string, placeholder: string, value: ReactNode): ReactNode {
  const idx = template.indexOf(placeholder);
  if (idx === -1) return template;
  return (
    <>
      {template.slice(0, idx)}
      {value}
      {template.slice(idx + placeholder.length)}
    </>
  );
}
