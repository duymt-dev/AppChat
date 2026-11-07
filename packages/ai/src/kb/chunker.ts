// Cắt đoạn theo cấu trúc (rag §5): đề mục → giữ đường dẫn heading ở `meta.path`; bảng giữ hàng tiêu đề ở mỗi đoạn; Excel / CSV
// mỗi dòng một đoạn kèm tên cột; đoạn văn gom tới ~800 token (≥ ~400 mới cắt ở đề mục mới), chồng nhau ~12%.
// Đoạn văn có số tiền (giá) tách thành đoạn riêng gắn `volatile` — giá / tồn / khuyến mãi luôn lấy qua read action, không từ RAG (rag §4).

export type DocBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'para'; text: string }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'row'; columns: string[]; values: string[]; row: number; sheet?: string };

export interface ChunkMeta {
  path?: string[];
  page?: number;
  row?: number;
  sheet?: string;
  volatile?: boolean;
}

export interface Chunk {
  content: string;
  tokens: number;
  meta: ChunkMeta;
}

export const CHUNK_MAX_TOKENS = 800;
export const CHUNK_MIN_TOKENS = 400;
const OVERLAP = 0.12;

/** Ước lượng token (~4 ký tự / token — đủ cho cắt đoạn; token thật lấy từ usage của model khi embed). */
export const tokensOf = (s: string) => Math.ceil(s.length / 4);

const MONEY = /\d[\d.,\s]*\s?(?:đ|₫|vnđ|vnd|đồng|k\b|nghìn|ngàn|triệu|tr\b)|(?:giá|price)\s*[:\-–]?\s*\d/iu;
export const hasPrice = (s: string) => MONEY.test(s);

const tableText = (header: string[], rows: string[][]) => [header, ...rows].map((r) => `| ${r.join(' | ')} |`).join('\n');

/** Phần đuôi ~12% của đoạn trước (cắt ở ranh giới từ) để đoạn sau không mất ngữ cảnh. */
function tail(text: string): string {
  const n = Math.floor(text.length * OVERLAP);
  if (n <= 0) return '';
  const cut = text.slice(text.length - n);
  const sp = cut.indexOf(' ');
  return sp > 0 ? cut.slice(sp + 1) : cut;
}

/** Tách đoạn văn quá dài theo câu (rồi theo từ) cho vừa CHUNK_MAX_TOKENS. */
function splitLong(text: string): string[] {
  if (tokensOf(text) <= CHUNK_MAX_TOKENS) return [text];
  const max = CHUNK_MAX_TOKENS * 4;
  const out: string[] = [];
  let cur = '';
  for (const part of text.split(/(?<=[.!?。])\s+|\s+/u)) {
    if (cur && cur.length + part.length + 1 > max) {
      out.push(cur);
      cur = '';
    }
    cur = cur ? `${cur} ${part}` : part;
    while (cur.length > max) {
      out.push(cur.slice(0, max));
      cur = cur.slice(max);
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function chunkDocument(blocks: DocBlock[]): Chunk[] {
  const out: Chunk[] = [];
  const path: string[] = [];
  let buf = '';
  let bufPath: string[] = [];

  const push = (content: string, meta: ChunkMeta) => {
    const c = content.trim();
    if (!c) return;
    out.push({ content: c, tokens: tokensOf(c), meta: { ...meta, ...(hasPrice(c) ? { volatile: true } : {}) } });
  };
  const flush = (keepTail: boolean) => {
    if (!buf.trim()) return;
    const prev = buf;
    push(prev, bufPath.length ? { path: bufPath } : {});
    buf = keepTail ? tail(prev) : '';
    bufPath = [...path];
  };
  const prefix = () => (path.length ? `${path.join(' › ')}\n` : '');

  for (const b of blocks) {
    if (b.type === 'heading') {
      if (tokensOf(buf) >= CHUNK_MIN_TOKENS) flush(false);
      // Đề mục cấp n thay đề mục cùng / dưới cấp; thiếu cấp trên (vd. tài liệu bắt đầu bằng ##) thì không chèn chỗ trống.
      path.splice(Math.min(path.length, Math.max(0, b.level - 1)));
      path.push(b.text.trim());
      if (!buf.trim()) bufPath = [...path];
      continue;
    }
    if (b.type === 'para') {
      // Đoạn văn có giá → đoạn riêng (volatile, không vào prompt) — không kéo theo nội dung không giá cùng đoạn (rag §4).
      if (hasPrice(b.text)) {
        flush(false);
        for (const piece of splitLong(b.text.trim())) push(prefix() + piece, path.length ? { path: [...path] } : {});
        continue;
      }
      for (const piece of splitLong(b.text.trim())) {
        if (!piece) continue;
        if (buf && tokensOf(buf) + tokensOf(piece) > CHUNK_MAX_TOKENS) flush(true);
        // Phần chồng + đoạn mới vẫn quá trần → bỏ phần chồng (đoạn mới đã gần trần).
        if (buf && tokensOf(buf) + tokensOf(piece) > CHUNK_MAX_TOKENS) buf = '';
        if (!buf.trim()) bufPath = [...path];
        buf = buf ? `${buf}\n\n${piece}` : piece;
      }
      continue;
    }
    flush(false);
    if (b.type === 'table') {
      // Mỗi nhóm dòng một đoạn, luôn kèm hàng tiêu đề.
      let group: string[][] = [];
      const headTokens = tokensOf(tableText(b.header, []));
      for (const r of b.rows) {
        if (group.length && headTokens + tokensOf(tableText([], [...group, r])) > CHUNK_MAX_TOKENS) {
          push(prefix() + tableText(b.header, group), path.length ? { path: [...path] } : {});
          group = [];
        }
        group.push(r);
      }
      if (group.length || !b.rows.length) push(prefix() + tableText(b.header, group), path.length ? { path: [...path] } : {});
    } else {
      const line = b.columns.map((c, i) => `${c}: ${b.values[i] ?? ''}`).filter((x) => !x.endsWith(': ')).join('; ');
      push(b.sheet ? `${b.sheet} — ${line}` : line, { row: b.row, ...(b.sheet ? { sheet: b.sheet } : {}) });
    }
  }
  flush(false);
  return out;
}
