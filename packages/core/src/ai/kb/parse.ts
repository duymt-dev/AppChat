// Parse tài liệu kho tri thức → khối có cấu trúc cho chunker (rag §5, Blueprint L1328): pdf (pdf-parse, theo trang), docx (mammoth →
// HTML → đề mục / đoạn / bảng), xlsx (exceljs, mỗi dòng kèm tên cột), csv, md (đề mục `#`), txt, html / URL (thẻ → khối).
// Không logic lưu trữ ở đây — ingest.ts gọi rồi cắt đoạn. Định dạng không đọc được → ParseError (nguồn `failed` + lý do).
import type { DocBlock } from '@appchat/ai';
import { csvRows, xlsxSheets } from '../../kernel/files/table';

export class ParseError extends Error {
  constructor(
    readonly reason: 'unsupported' | 'empty' | 'corrupt' | 'fetch_failed',
    message: string,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/** Đuôi tệp → kind lưu ở `kb_source.kind` (Blueprint §2.2); null = chỉ lưu, không học được. */
export function kindOf(name: string, mime = ''): string | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'csv' || mime === 'text/csv') return 'csv';
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'txt' || mime === 'text/plain') return 'txt';
  if (ext === 'html' || ext === 'htm' || mime === 'text/html') return 'html';
  return null;
}

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_m, e: string) => ENTITY[e] ?? '').replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)));
const strip = (s: string) => decode(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();

/** HTML (docx qua mammoth, trang web) → khối: h1–h6, p / li / blockquote, table (hàng đầu = tiêu đề). */
export function htmlBlocks(html: string): DocBlock[] {
  const body = html.replace(/<(script|style|head|nav|footer|noscript|svg)[\s\S]*?<\/\1>/gi, '');
  const out: DocBlock[] = [];
  const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>|<table[^>]*>([\s\S]*?)<\/table>|<(p|li|blockquote|pre|td)[^>]*>([\s\S]*?)<\/\4>/gi;
  for (const m of body.matchAll(re)) {
    if (m[1]) {
      const text = strip(m[2]!);
      if (text) out.push({ type: 'heading', level: Number(m[1][1]), text });
    } else if (m[3] !== undefined) {
      const rows = [...m[3].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) => [...r[1]!.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => strip(c[1]!)));
      const [header, ...rest] = rows.filter((r) => r.some(Boolean));
      if (header) out.push({ type: 'table', header, rows: rest });
    } else {
      const text = strip(m[5]!);
      if (text) out.push({ type: 'para', text });
    }
  }
  // Trang không có thẻ khối (văn bản thuần trong body) → cả trang một đoạn.
  if (!out.length) {
    const text = strip(body);
    if (text) out.push({ type: 'para', text });
  }
  return out;
}

/** Markdown: `#` → đề mục, bảng `| a | b |` giữ hàng tiêu đề, còn lại tách đoạn theo dòng trống. */
export function markdownBlocks(md: string): DocBlock[] {
  const out: DocBlock[] = [];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  const flush = () => {
    const t = para.join('\n').trim();
    if (t) out.push({ type: 'para', text: t });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    const h = /^(#{1,6})\s+(.*)$/.exec(l);
    if (h) {
      flush();
      out.push({ type: 'heading', level: h[1]!.length, text: h[2]!.trim() });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(l) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? '')) {
      flush();
      const cells = (x: string) => x.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const header = cells(l);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) rows.push(cells(lines[i++]!));
      i--;
      out.push({ type: 'table', header, rows });
      continue;
    }
    if (!l.trim()) flush();
    else para.push(l);
  }
  flush();
  return out;
}

const textBlocks = (s: string): DocBlock[] =>
  s.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((text) => ({ type: 'para' as const, text }));

/** CSV → mỗi dòng một khối kèm tên cột (đọc dòng ở kernel/files/table). */
export function csvBlocks(csv: string): DocBlock[] {
  const [columns, ...data] = csvRows(csv);
  if (!columns) return [];
  return data.map((values, i) => ({ type: 'row' as const, columns, values, row: i + 2 }));
}

async function xlsxBlocks(body: Buffer): Promise<DocBlock[]> {
  const out: DocBlock[] = [];
  for (const ws of await xlsxSheets(body)) {
    const [head, ...rest] = ws.rows;
    if (!head) continue;
    for (const r of rest) out.push({ type: 'row', columns: head.values, values: r.values, row: r.n, sheet: ws.name });
  }
  return out;
}

async function pdfBlocks(body: Buffer): Promise<DocBlock[]> {
  const { default: pdf } = await import('pdf-parse');
  const r = await pdf(body);
  // pdf-parse nối các trang bằng "\n\n" — tách đoạn theo dòng trống, gộp dòng ngắt cứng trong đoạn.
  return textBlocks(r.text).map((b) => (b.type === 'para' ? { ...b, text: b.text.replace(/\s*\n\s*/g, ' ') } : b));
}

/** Nội dung tệp → khối. `kind` theo `kindOf`. */
export async function parseDocument(kind: string, body: Buffer): Promise<DocBlock[]> {
  let blocks: DocBlock[];
  try {
    switch (kind) {
      case 'pdf':
        blocks = await pdfBlocks(body);
        break;
      case 'docx': {
        const { default: mammoth } = await import('mammoth');
        blocks = htmlBlocks((await mammoth.convertToHtml({ buffer: body })).value);
        break;
      }
      case 'xlsx':
        blocks = await xlsxBlocks(body);
        break;
      case 'csv':
        blocks = csvBlocks(body.toString('utf8'));
        break;
      case 'md':
        blocks = markdownBlocks(body.toString('utf8'));
        break;
      case 'txt':
      case 'text':
        blocks = textBlocks(body.toString('utf8'));
        break;
      case 'html':
      case 'url':
        blocks = htmlBlocks(body.toString('utf8'));
        break;
      default:
        throw new ParseError('unsupported', `Chưa đọc được định dạng ${kind}`);
    }
  } catch (err) {
    if (err instanceof ParseError) throw err;
    throw new ParseError('corrupt', `Tệp ${kind} hỏng hoặc không đọc được: ${err instanceof Error ? err.message.slice(0, 160) : 'lỗi'}`);
  }
  if (!blocks.length) throw new ParseError('empty', 'Tài liệu không có nội dung chữ');
  return blocks;
}
