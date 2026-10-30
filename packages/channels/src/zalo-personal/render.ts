// Markdown tối giản → rich text Zalo (Blueprint §6 "markdown → rich text", manifest `markdown: 'rich'`): **đậm**, *nghiêng* /
// _nghiêng_, ~~gạch~~ thành đoạn style (b / i / s) trên chuỗi đã bỏ ký hiệu; chia tin ≤ maxTextLength theo ranh giới dòng / chữ.
import type { ZaloStyle } from './transport';

const MARKS: [RegExp, ZaloStyle['st']][] = [
  [/\*\*(.+?)\*\*/s, 'b'],
  [/~~(.+?)~~/s, 's'],
  [/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/s, 'i'],
  [/(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])/s, 'i'],
];

export interface RichText {
  msg: string;
  styles: ZaloStyle[];
}

/** Lấy cặp ký hiệu xuất hiện sớm nhất, bỏ ký hiệu, ghi style; lặp tới khi hết. Lồng nhau được (đậm trong nghiêng). */
export function toRichText(md: string): RichText {
  let msg = md;
  const styles: ZaloStyle[] = [];
  for (;;) {
    let best: { m: RegExpExecArray; st: ZaloStyle['st'] } | null = null;
    for (const [re, st] of MARKS) {
      const m = re.exec(msg);
      if (m && (!best || m.index < best.m.index)) best = { m, st };
    }
    if (!best) break;
    const { m, st } = best;
    const open = (m[0].length - m[1]!.length) / 2;
    const start = m.index;
    // Ánh xạ vị trí cũ → mới sau khi xoá ký hiệu mở [start, start+open) và đóng [end-open, end) — style đã có co / dời theo.
    const end = start + m[0].length;
    const map = (pos: number) => pos - Math.min(Math.max(pos - start, 0), open) - Math.min(Math.max(pos - (end - open), 0), open);
    for (const s of styles) {
      const a = map(s.start);
      s.len = map(s.start + s.len) - a;
      s.start = a;
    }
    msg = msg.slice(0, start) + m[1] + msg.slice(start + m[0].length);
    styles.push({ start, len: m[1]!.length, st });
  }
  return { msg, styles: styles.sort((a, b) => a.start - b.start) };
}

/** Chia `text` thành đoạn ≤ max: ưu tiên cắt ở xuống dòng, rồi khoảng trắng; từ quá dài thì cắt cứng. */
export function chunkText(text: string, max: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const win = rest.slice(0, max + 1);
    let cut = win.lastIndexOf('\n');
    if (cut < max / 2) cut = win.lastIndexOf(' ');
    if (cut <= 0) cut = max;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).replace(/^[ \n]+/, '');
  }
  if (rest.length || !out.length) out.push(rest);
  return out;
}

/** Chia rồi render từng đoạn (style tính lại trong đoạn — không có style vắt qua hai tin). */
export const renderChunks = (md: string, max: number): RichText[] => chunkText(md, max).map(toRichText);
