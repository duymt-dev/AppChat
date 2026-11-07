// Đoạn trích kết quả tìm có tô (TIP-025b §B.3): `ranges` là vị trí UTF-16 trên chuỗi GỐC (server tính qua foldRanges) — cắt chuỗi gốc
// thành đoạn chữ thường / <mark>, không bao giờ chèn HTML thô. Thân dài → cửa sổ quanh lần khớp đầu.
'use client';
import { Fragment } from 'react';

const SPAN = 60;
const ELLIPSIS = '…';

export function HitSnippet({ body, ranges, className }: { body: string; ranges: [number, number][]; className?: string }) {
  const first = ranges[0]?.[0] ?? 0;
  const from = Math.max(0, first - SPAN);
  const to = Math.min(body.length, first + SPAN * 2);
  const parts: { text: string; hit: boolean }[] = [];
  let at = from;
  for (const [s, e] of ranges) {
    if (e <= from || s >= to) continue;
    const a = Math.max(s, from);
    const b = Math.min(e, to);
    if (a > at) parts.push({ text: body.slice(at, a), hit: false });
    parts.push({ text: body.slice(a, b), hit: true });
    at = b;
  }
  if (at < to) parts.push({ text: body.slice(at, to), hit: false });
  return (
    <span className={className} data-testid="thread-search-snippet">
      {from > 0 ? ELLIPSIS : null}
      {parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <Fragment key={i}>{p.text}</Fragment>))}
      {to < body.length ? ELLIPSIS : null}
    </span>
  );
}
