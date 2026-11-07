// Hiển thị đoạn chữ có <b>…</b> (định dạng đậm của nội dung kênh / AI) mà không dùng innerHTML.
import { Fragment } from 'react';

const BOLD = /<b(?: data-tone="(\w+)")?>(.*?)<\/b>/g;

export function Rich({ text, toneClass }: { text: string; toneClass?: Record<string, string> }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(BOLD)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <b key={m.index} className={m[1] ? toneClass?.[m[1]] : undefined}>
        {m[2]}
      </b>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
