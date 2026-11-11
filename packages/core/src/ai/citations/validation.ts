// Kiểm trích dẫn của một câu trả lời (TIP-020d §1.3–1.4): model CHỌN bí danh + đoạn chữ được chống đỡ, không tự khẳng định đúng. Mỗi trích
// dẫn phải: bí danh có trong sổ của đúng run; vị trí (điểm mã trên `reply` thô) ánh xạ được qua bản chữ (LF / trim / khôi phục PII) hoặc
// `quote` xuất hiện đúng một lần trong chữ cuối; nguồn còn hiện hành theo binding đã cho phép nó + cùng thế hệ + đoạn còn tồn tại. Một trích
// dẫn hỏng → CẢ ứng viên không hợp lệ (không lọc bớt rồi trình bày là đã kiểm, không gọi model sửa). Câu trả lời có tài liệu trong sổ mà
// không trích dẫn → `missing` (không tự gửi như có căn cứ). Chữ thường (không JSON) → không có trích dẫn đã kiểm.
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import type { AgentReply } from '@appchat/ai';
import { admit } from '../kb/scope/authority';
import { parseKnowledge } from '../kb/scope/context';
import { sourceSql } from '../kb/scope/query';
import type { RegistryEntry } from './binding';
import { quoteSpan, replyDigest, textRevision } from './text-revision';

const ALIAS_MARK = /(?<![\p{L}\p{N}])\[?S\d{1,2}\]?(?![\p{L}\p{N}])/u;

/** Tên kiểu tệp / đường dẫn (`bang-gia.pdf`, `noi-bo/quy-trinh`) — nhãn nội bộ; tiêu đề chữ thường ("Giờ mở cửa") là ngôn ngữ tự nhiên, không chặn. */
const FILE_LIKE = /[\\/]|\.[a-z0-9]{2,5}$/i;

/** Tên tệp / đường dẫn của nguồn trong sổ xuất hiện nguyên văn trong câu trả lời — dấu hiệu lộ nhãn nội bộ (không thay chính sách nguồn). */
async function leaksSourceName(db: Pick<TenantDb, '$queryRaw'>, text: string, registry: readonly RegistryEntry[]): Promise<boolean> {
  const ids = [...new Set(registry.map((e) => e.s))];
  const rows = await db.$queryRaw<{ name: string }[]>(Prisma.sql`SELECT name FROM kb_source WHERE id = ANY(${ids}::uuid[])`);
  const low = text.toLowerCase();
  return rows.some((r) => {
    const n = r.name.trim();
    return n.length >= 6 && FILE_LIKE.test(n) && low.includes(n.toLowerCase());
  });
}

export interface Citation {
  source_id: string;
  chunk_id: string;
  source_generation: number;
  claim_start: number;
  claim_end: number;
}

export type CitationOutcome =
  /** Không có tài liệu trong sổ / model không trích dẫn và không có tài liệu → không có trích dẫn (không phải lỗi). */
  | { kind: 'none'; text: string; digest: string }
  /** Có tài liệu trong sổ nhưng câu trả lời không trích dẫn → cần người xem lại (không tự gửi như có căn cứ). */
  | { kind: 'missing'; text: string; digest: string }
  | { kind: 'invalid'; reason: string }
  | { kind: 'validated'; text: string; digest: string; citations: Citation[] };

type Db = Pick<TenantDb, 'aiRun' | 'aiAgent' | 'aiAgentVersion' | '$queryRaw'>;

/** Nguồn của sổ còn hiện hành (binding cho phép · phạm vi / quyền hiện hành · cùng thế hệ · đoạn còn) — theo từng binding. */
export async function entriesCurrent(db: Db, entries: readonly RegistryEntry[]): Promise<boolean> {
  const byBinding = new Map<string, RegistryEntry[]>();
  for (const e of entries) byBinding.set(e.b, [...(byBinding.get(e.b) ?? []), e]);
  for (const [b, group] of byBinding) {
    const k = parseKnowledge((await db.aiRun.findUnique({ where: { id: b }, select: { knowledge: true } }))?.knowledge);
    if (!k) return false;
    // Quyền người đã kiểm ở lời truy hồi; ở đây kiểm vòng đời nguồn / phạm vi hiện hành / thế hệ (như knowledgeCurrent không resolver).
    const a = await admit(db, k, { userId: '', isOwner: true, permissions: new Set(), scope: { inbox: 'all', crm: 'all', sales: 'all', booking: 'all', support: 'all', insights: 'all' }, teamIds: [] });
    if (!a.ok) return false;
    const rows = await db.$queryRaw<{ id: string; seq: number; chunk: string }[]>(Prisma.sql`
      SELECT s.id::text AS id, s.ingest_seq AS seq, c.id::text AS chunk
      FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
      WHERE c.id = ANY(${group.map((x) => x.c)}::uuid[]) AND ${sourceSql(a.r)}`);
    const live = new Map(rows.map((x) => [x.chunk, { s: x.id, g: Number(x.seq) }]));
    if (!group.every((x) => live.get(x.c)?.s === x.s && live.get(x.c)?.g === x.g)) return false;
  }
  return true;
}

/** Kiểm một câu trả lời đã parse — `pii` là bảng che của lượt; sổ đọc từ DB của run (không từ model / client). */
export async function validateAnswer(db: Db, out: Pick<AgentReply, 'raw_reply' | 'reply' | 'citations'>, pii: Record<string, string>, registry: readonly RegistryEntry[]): Promise<CitationOutcome> {
  const raw = out.raw_reply ?? out.reply ?? '';
  const rev = textRevision(raw, pii);
  const digest = replyDigest(rev.text);
  // §4.1: câu gửi khách không mang nhãn nguồn nội bộ — mã bí danh hay tên tài liệu đã đưa vào run lọt vào chữ → không hợp lệ.
  if (registry.length && (ALIAS_MARK.test(rev.text) || (await leaksSourceName(db, rev.text, registry)))) return { kind: 'invalid', reason: 'source_metadata' };
  if (out.citations === 'invalid') return { kind: 'invalid', reason: 'citation_schema' };
  if (!out.citations?.length) return registry.length ? { kind: 'missing', text: rev.text, digest } : { kind: 'none', text: rev.text, digest };
  const byAlias = new Map(registry.map((e) => [e.a, e]));
  const used: RegistryEntry[] = [];
  const cites: Citation[] = [];
  const seen = new Set<string>();
  for (const c of out.citations) {
    const e = byAlias.get(c.ref);
    if (!e) return { kind: 'invalid', reason: 'unknown_ref' };
    let span: { start: number; end: number } | null = null;
    if (c.claim_start !== undefined && c.claim_end !== undefined) {
      const s = rev.map(c.claim_start);
      const t = rev.map(c.claim_end);
      span = s !== undefined && t !== undefined && s < t ? { start: s, end: t } : null;
    } else if (c.quote) span = quoteSpan(rev.text, c.quote);
    if (!span || span.end > rev.length) return { kind: 'invalid', reason: 'bad_span' };
    const k = `${e.a}:${span.start}:${span.end}`;
    if (seen.has(k)) continue;
    seen.add(k);
    used.push(e);
    cites.push({ source_id: e.s, chunk_id: e.c, source_generation: e.g, claim_start: span.start, claim_end: span.end });
  }
  if (!(await entriesCurrent(db, used))) return { kind: 'invalid', reason: 'source_changed' };
  return { kind: 'validated', text: rev.text, digest, citations: cites };
}
