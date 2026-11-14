// Mô hình soạn mô tả sản phẩm (TIP-027b §2.4) — thuần, không DOM. Tài liệu đóng của shared được trải thành DÒNG (khối đoạn / mục danh sách
// chấm / số) gồm các RUN chữ có dấu. Vùng chọn là cặp vị trí (dòng, offset theo code unit) — offset luôn dời về ranh giới grapheme (không
// tách cặp surrogate / dấu kết hợp tiếng Việt khi áp định dạng). Thao tác: bật / tắt dấu trên vùng chọn, đổi khối danh sách cho các dòng
// chạm vùng chọn, chèn chữ thuần (dán: chữ là chữ, `<b>` giữ nguyên ký tự), xoá. Kết quả về lại tài liệu dạng chuẩn của shared.
import { canonicalDoc, DESCRIPTION_DOC_VERSION, type DescriptionDoc, type DescriptionMark, type DescriptionText } from '@appchat/shared';

export type LineKind = 'paragraph' | 'bullet' | 'ordered';
export interface Run {
  text: string;
  marks: DescriptionMark[];
}
export interface Line {
  kind: LineKind;
  runs: Run[];
}
export interface Pos {
  line: number;
  offset: number;
}
export interface Sel {
  anchor: Pos;
  focus: Pos;
}

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('vi', { granularity: 'grapheme' }) : null;
const LOW = /[\uDC00-\uDFFF]/;
const HIGH = /[\uD800-\uDBFF]/;

/** Ranh giới grapheme gần nhất ≤ offset (không bao giờ giữa cặp surrogate / dấu kết hợp). */
export function snap(text: string, offset: number): number {
  const o = Math.max(0, Math.min(offset, text.length));
  if (o === text.length) return o;
  if (!seg) return o > 0 && LOW.test(text[o]!) ? o - 1 : o;
  let last = 0;
  for (const s of seg.segment(text)) {
    if (s.index > o) break;
    last = s.index;
  }
  return last;
}

/** Ranh giới grapheme kế tiếp > offset (cuối chữ nếu không còn). */
export function nextBoundary(text: string, offset: number): number {
  if (offset >= text.length) return text.length;
  if (!seg) return Math.min(text.length, offset + (HIGH.test(text[offset]!) ? 2 : 1));
  for (const s of seg.segment(text)) if (s.index > offset) return s.index;
  return text.length;
}

const sameMarks = (a: DescriptionMark[], b: DescriptionMark[]) => a.length === b.length && a.every((m) => b.includes(m));
const sorted = (m: DescriptionMark[]) => (['bold', 'italic', 'underline'] as const).filter((x) => m.includes(x));
export const lineText = (l: Line) => l.runs.map((r) => r.text).join('');

/** Gộp run kề cùng dấu, bỏ run rỗng. */
function norm(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const prev = out.at(-1);
    if (prev && sameMarks(prev.marks, r.marks)) prev.text += r.text;
    else out.push({ text: r.text, marks: sorted(r.marks) });
  }
  return out;
}

const toRuns = (c: DescriptionText[] | undefined): Run[] => norm((c ?? []).map((t) => ({ text: t.text, marks: [...(t.marks ?? [])] })));

/** Tài liệu (hoặc chữ thuần của sản phẩm cũ — một đoạn mỗi dòng, chữ là chữ) → dòng soạn. */
export function linesOf(doc: DescriptionDoc | null | undefined, plain = ''): Line[] {
  if (!doc) return (plain || '').split('\n').map((t) => ({ kind: 'paragraph' as const, runs: t ? [{ text: t, marks: [] }] : [] }));
  const lines: Line[] = [];
  for (const b of doc.content) {
    if (b.type === 'paragraph') lines.push({ kind: 'paragraph', runs: toRuns(b.content) });
    else for (const it of b.content) lines.push({ kind: b.type === 'bullet_list' ? 'bullet' : 'ordered', runs: toRuns(it.content) });
  }
  return lines.length ? lines : [{ kind: 'paragraph', runs: [] }];
}

const nodes = (runs: Run[]): DescriptionText[] => runs.map((r) => ({ type: 'text', text: r.text, ...(r.marks.length ? { marks: [...r.marks] } : {}) }));

/** Dòng → tài liệu dạng chuẩn (mục danh sách kề cùng loại gộp thành một danh sách). */
export function docOf(lines: Line[]): DescriptionDoc {
  const content: DescriptionDoc['content'] = [];
  for (const l of lines) {
    if (l.kind === 'paragraph') {
      content.push({ type: 'paragraph', ...(l.runs.length ? { content: nodes(l.runs) } : {}) });
      continue;
    }
    const t = l.kind === 'bullet' ? 'bullet_list' : 'ordered_list';
    const prev = content.at(-1);
    const item = { type: 'list_item' as const, ...(l.runs.length ? { content: nodes(l.runs) } : {}) };
    if (prev && prev.type === t) prev.content.push(item);
    else content.push({ type: t, content: [item] });
  }
  return canonicalDoc({ type: 'doc', version: DESCRIPTION_DOC_VERSION, content });
}

const before = (a: Pos, b: Pos) => a.line < b.line || (a.line === b.line && a.offset <= b.offset);
export const ordered = (s: Sel): [Pos, Pos] => (before(s.anchor, s.focus) ? [s.anchor, s.focus] : [s.focus, s.anchor]);
export const collapsed = (s: Sel) => s.anchor.line === s.focus.line && s.anchor.offset === s.focus.offset;

/** Tách run của dòng tại offset → [trái, phải]. */
function split(runs: Run[], at: number): [Run[], Run[]] {
  const l: Run[] = [];
  const r: Run[] = [];
  let pos = 0;
  for (const run of runs) {
    const end = pos + run.text.length;
    if (end <= at) l.push(run);
    else if (pos >= at) r.push(run);
    else {
      l.push({ text: run.text.slice(0, at - pos), marks: run.marks });
      r.push({ text: run.text.slice(at - pos), marks: run.marks });
    }
    pos = end;
  }
  return [l, r];
}

/** Đoạn [from, to) của mỗi dòng nằm trong vùng chọn (sau khi dời về ranh giới grapheme). */
function spans(lines: Line[], s: Sel): { line: number; from: number; to: number }[] {
  const [a, b] = ordered(s);
  const out = [];
  for (let i = a.line; i <= b.line; i++) {
    const t = lineText(lines[i]!);
    out.push({ line: i, from: i === a.line ? snap(t, a.offset) : 0, to: i === b.line ? snap(t, b.offset) : t.length });
  }
  return out;
}

/** Vùng chọn đã mang dấu `m` toàn bộ (để nút hiện trạng thái bật và lần bấm kế là tắt). */
export function hasMark(lines: Line[], s: Sel, m: DescriptionMark): boolean {
  let any = false;
  for (const { line, from, to } of spans(lines, s)) {
    if (from === to) continue;
    const [, rest] = split(lines[line]!.runs, from);
    const [mid] = split(rest, to - from);
    for (const r of mid) {
      any = true;
      if (!r.marks.includes(m)) return false;
    }
  }
  return any;
}

/** Bật dấu cho toàn vùng chọn, hoặc tắt nếu cả vùng đã có. Vùng rỗng → không đổi (không có "dấu chờ"). */
export function toggleMark(lines: Line[], s: Sel, m: DescriptionMark): Line[] {
  const on = !hasMark(lines, s, m);
  const next = lines.map((l) => ({ ...l, runs: [...l.runs] }));
  for (const { line, from, to } of spans(lines, s)) {
    if (from === to) continue;
    const [left, rest] = split(next[line]!.runs, from);
    const [mid, right] = split(rest, to - from);
    const changed = mid.map((r) => ({ text: r.text, marks: on ? sorted([...new Set([...r.marks, m])]) : r.marks.filter((x) => x !== m) }));
    next[line]!.runs = norm([...left, ...changed, ...right]);
  }
  return next;
}

/** Đổi khối danh sách cho mọi dòng chạm vùng chọn: đã cùng loại hết → về đoạn; ngược lại → loại đó. */
export function toggleList(lines: Line[], s: Sel, kind: 'bullet' | 'ordered'): Line[] {
  const [a, b] = ordered(s);
  const all = lines.slice(a.line, b.line + 1).every((l) => l.kind === kind);
  return lines.map((l, i) => (i >= a.line && i <= b.line ? { ...l, kind: all ? 'paragraph' : kind } : l));
}

export function listKind(lines: Line[], s: Sel): LineKind | 'mixed' {
  const [a, b] = ordered(s);
  const kinds = new Set(lines.slice(a.line, b.line + 1).map((l) => l.kind));
  return kinds.size === 1 ? [...kinds][0]! : 'mixed';
}

/**
 * Thay vùng chọn bằng chữ thuần (gõ / dán / IME đã hoàn tất). Xuống dòng tách dòng mới cùng loại khối. Chữ mới mang dấu của run ngay trước
 * con trỏ (gõ tiếp trong chữ đậm vẫn đậm). Trả dòng mới + vị trí con trỏ sau chữ chèn.
 */
export function insertText(lines: Line[], s: Sel, text: string): { lines: Line[]; caret: Pos } {
  const [a0, b0] = ordered(s);
  const a = { line: a0.line, offset: snap(lineText(lines[a0.line]!), a0.offset) };
  const b = { line: b0.line, offset: snap(lineText(lines[b0.line]!), b0.offset) };
  const [left] = split(lines[a.line]!.runs, a.offset);
  const [, right] = split(lines[b.line]!.runs, b.offset);
  const marks = left.at(-1)?.marks ?? right[0]?.marks ?? [];
  const parts = text.replace(/\r\n?/g, '\n').split('\n');
  const kind = lines[a.line]!.kind;
  const made: Line[] = parts.map((p) => ({ kind, runs: [{ text: p, marks }] }));
  made[0]!.runs = norm([...left, ...made[0]!.runs]);
  const lastLen = lineText(made.at(-1)!).length;
  made[made.length - 1]!.runs = norm([...made.at(-1)!.runs, ...right]);
  const next = [...lines.slice(0, a.line), ...made, ...lines.slice(b.line + 1)];
  return { lines: next, caret: { line: a.line + parts.length - 1, offset: lastLen } };
}

/** Xoá lùi / tiến một grapheme (vùng rỗng) hoặc xoá vùng chọn. Đầu dòng + lùi → nối với dòng trên. */
export function deleteAt(lines: Line[], s: Sel, dir: 'back' | 'forward'): { lines: Line[]; caret: Pos } {
  if (!collapsed(s)) return insertText(lines, s, '');
  const { line, offset } = s.anchor;
  const t = lineText(lines[line]!);
  if (dir === 'back') {
    if (offset > 0) return insertText(lines, { anchor: { line, offset: snap(t, offset - 1) }, focus: { line, offset } }, '');
    if (line === 0) return { lines, caret: s.anchor };
    return insertText(lines, { anchor: { line: line - 1, offset: lineText(lines[line - 1]!).length }, focus: { line, offset: 0 } }, '');
  }
  if (offset < t.length) return insertText(lines, { anchor: { line, offset }, focus: { line, offset: nextBoundary(t, offset) } }, '');
  if (line === lines.length - 1) return { lines, caret: s.anchor };
  return insertText(lines, { anchor: { line, offset }, focus: { line: line + 1, offset: 0 } }, '');
}
