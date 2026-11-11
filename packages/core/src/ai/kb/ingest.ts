// Nạp một nguồn tri thức (rag §5, queue `kb-ingest` ở worker ROLE=ai): lấy nội dung (tệp ở Storage / URL / văn bản) → parse → cắt đoạn
// → embed theo lô (router purpose `embed`, trừ credit theo `model_price` — nguồn ví `kb`) → thay toàn bộ đoạn cũ trong MỘT transaction
// → `ready` + `kb.source_ready`. Lỗi → `failed` + lý do + `kb.source_failed`. Idempotent: nguồn đã xoá / không ở `pending` |
// `processing` thì bỏ; `learn=false` → `ready`, 0 đoạn, không gọi model. Không giữ gì trong RAM giữa các lần.
import { chunkDocument, type Embedder } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { CreditMeter } from '../../billing/public';
import type { FilesService } from '../../kernel/files/files.service';
import { uuidv7 } from '../../kernel/ids';
import type { AppLogger } from '../../kernel/logger/logger';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { FetchLimitError, safeFetch, UrlRefusedError } from '../../kernel/http/safe-fetch';
import { ParseError, parseDocument } from './parse';
import { embedChunks } from './ingest-usage';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export const KB_INGEST_QUEUE = 'kb-ingest';
/** Tải URL tối đa (byte) + thời gian chờ. */
const URL_MAX_BYTES = 5 * 1024 * 1024;
const URL_TIMEOUT_MS = 10_000;

export interface KbIngestJob {
  ws: string;
  source_id: string;
}

export interface IngestDeps {
  files: FilesService;
  embedder: Embedder | null;
  meter: (Pick<CreditMeter, 'assertBalance' | 'charge'> & Partial<Pick<CreditMeter, 'price' | 'usage'>>) | null;
  log: AppLogger;
  now: () => Date;
  /** Sau commit có event → đánh dấu workspace cho outbox relay (`markDirty`). */
  dirty?: (ws: string) => Promise<void>;
  /** Tải URL (test thay bằng bản giả). */
  fetchUrl?: (url: string) => Promise<{ body: Buffer; mime: string }>;
}

export type IngestOutcome = { status: 'ready'; chunks: number } | { status: 'failed'; error: string } | { status: 'skipped' };

type Db = Pick<TenantDb, 'kbSource' | 'kbChunk' | 'file' | '$transaction' | '$executeRaw'>;

const vecLit = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;

/** Tải trang nguồn URL qua safeFetch (TIP-045b — chặn SSRF: địa chỉ nội bộ / metadata, redirect, DNS rebinding; cắt thân > 5MB). */
export async function fetchUrlDefault(url: string): Promise<{ body: Buffer; mime: string }> {
  let r: Awaited<ReturnType<typeof safeFetch>>;
  try {
    r = await safeFetch(url, { maxBytes: URL_MAX_BYTES, timeoutMs: URL_TIMEOUT_MS, headers: { 'user-agent': 'AppChatBot/1.0 (+kb)' } });
  } catch (e) {
    if (e instanceof UrlRefusedError) throw new ParseError('fetch_failed', 'Địa chỉ không được phép (nội bộ / sai giao thức)');
    if (e instanceof FetchLimitError) throw new ParseError('fetch_failed', e.reason === 'too_large' ? 'Trang quá lớn' : e.reason === 'timeout' ? 'Trang phản hồi quá lâu' : 'Chuyển hướng không hợp lệ');
    throw new ParseError('fetch_failed', 'Không tải được trang');
  }
  if (r.status < 200 || r.status >= 300) throw new ParseError('fetch_failed', `Trang trả HTTP ${r.status}`);
  return { body: r.body, mime: r.headers['content-type'] ?? 'text/html' };
}

/** Nội dung gốc của nguồn → (kind để parse, bytes). */
async function contentOf(db: Db, d: IngestDeps, s: { kind: string; fileId: string | null; url: string | null; body: string | null }) {
  if (s.fileId) {
    const f = await d.files.read(db, s.fileId);
    if (!f) throw new ParseError('corrupt', 'Không còn tệp gốc');
    return { kind: s.kind, body: f.body };
  }
  if (s.url) {
    const r = await (d.fetchUrl ?? fetchUrlDefault)(s.url);
    // HTML → khối theo thẻ (htmlBlocks); PDF → pdf-parse; còn lại coi là văn bản thuần.
    return { kind: r.mime.includes('html') ? 'url' : r.mime.includes('pdf') ? 'pdf' : 'txt', body: r.body };
  }
  if (s.body !== null) return { kind: 'text', body: Buffer.from(s.body, 'utf8') };
  throw new ParseError('empty', 'Nguồn không có nội dung');
}

export async function ingestSource(db: Db, ws: string, sourceId: string, d: IngestDeps): Promise<IngestOutcome> {
  // Giành nguồn: pending | processing (job chạy lại sau khi worker chết) → processing. Đã xoá / ready / failed → bỏ.
  const claimed = await db.kbSource.updateMany({ where: { id: sourceId, deletedAt: null, status: { in: ['pending', 'processing'] } }, data: { status: 'processing', error: null } });
  if (!claimed.count) return { status: 'skipped' };
  const s = (await db.kbSource.findUnique({ where: { id: sourceId } }))!;

  const fail = async (error: string): Promise<IngestOutcome> => {
    await inEventTransaction(db, ws, async (tx) => {
      await tx.kbSource.update({ where: { id: sourceId }, data: { status: 'failed', error: error.slice(0, 300), refreshedAt: d.now() } });
      await writeOutbox(tx, ws, [{ topic: 'kb.source_failed', payload: { source_id: sourceId, error: error.slice(0, 300), created_by: s.createdBy } }], d.now());
    });
    await d.dirty?.(ws);
    return { status: 'failed', error };
  };

  if (!s.learn) {
    await db.$transaction(async (tx) => {
      await tx.kbChunk.deleteMany({ where: { sourceId } });
      await tx.kbSource.update({ where: { id: sourceId }, data: { status: 'ready', chunkCount: 0, refreshedAt: d.now() } });
    });
    return { status: 'ready', chunks: 0 };
  }

  try {
    const src = await contentOf(db, d, s);
    const chunks = chunkDocument(await parseDocument(src.kind, src.body));
    if (!d.embedder) return await fail('Chưa cấu hình model embedding');
    await d.meter?.assertBalance(ws);
    const e = await embedChunks(db, ws, { id: sourceId, seq: s.ingestSeq, name: s.name }, chunks.map((c) => c.content), { embedder: d.embedder, meter: d.meter, now: d.now });
    const model = `${e.provider}:${e.model}`;
    await inEventTransaction(db, ws, async (tx) => {
      await tx.kbChunk.deleteMany({ where: { sourceId } });
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i]!;
        await tx.$executeRaw`INSERT INTO kb_chunk (id, source_id, ord, content, embedding, embed_model, token_count, meta)
          VALUES (${uuidv7()}::uuid, ${sourceId}::uuid, ${i}, ${c.content}, ${vecLit(e.vectors[i]!)}::vector, ${model}, ${c.tokens}, ${JSON.stringify(c.meta)}::jsonb)`;
      }
      await tx.kbSource.update({ where: { id: sourceId }, data: { status: 'ready', chunkCount: chunks.length, error: null, refreshedAt: d.now() } });
      await writeOutbox(tx, ws, [{ topic: 'kb.source_ready', payload: { source_id: sourceId, chunk_count: chunks.length } }], d.now());
    });
    await d.dirty?.(ws);
    return { status: 'ready', chunks: chunks.length };
  } catch (err) {
    if (err instanceof ParseError) return fail(err.message);
    if ((err as { code?: string })?.code === 'CREDIT_EXHAUSTED') return fail('Hết credit — nạp thêm rồi bấm Học lại');
    if ((err as { code?: string })?.code === 'USAGE_UNKNOWN') return fail('Lời gọi embedding chưa rõ kết quả — chờ đối soát rồi bấm Học lại');
    d.log.warn({ err, source: sourceId }, 'kb ingest failed');
    return fail(err instanceof Error ? `Lỗi nạp: ${err.message.slice(0, 200)}` : 'Lỗi nạp');
  }
}
