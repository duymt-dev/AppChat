// Nạp một nguồn tri thức (rag §5, queue `kb-ingest` ở worker ROLE=ai): lấy nội dung (tệp ở Storage / URL / văn bản) → parse → cắt đoạn
// → embed theo lô (router purpose `embed`, trừ credit theo `model_price` — nguồn ví `kb`) → thay toàn bộ đoạn cũ trong MỘT transaction
// → `ready` + `kb.source_ready`. Lỗi → `failed` + lý do + `kb.source_failed`. Idempotent: nguồn đã xoá / không ở `pending` |
// `processing` thì bỏ; `learn=false` → `ready`, 0 đoạn, không gọi model. Không giữ gì trong RAM giữa các lần.
import { chunkDocument, type Embedder } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { CreditMeter } from '../../billing/public';
import type { FilesService } from '../../kernel/files/files.service';
import { uuidv7 } from '../../kernel/ids';
import type { AppLogger } from '../../kernel/logger/logger';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { ParseError, parseDocument } from './parse';

export const KB_INGEST_QUEUE = 'kb-ingest';
/** Tải URL tối đa (byte) + thời gian chờ. */
const URL_MAX_BYTES = 5 * 1024 * 1024;
const URL_TIMEOUT_MS = 20_000;

export interface KbIngestJob {
  ws: string;
  source_id: string;
}

export interface IngestDeps {
  files: FilesService;
  embedder: Embedder | null;
  meter: Pick<CreditMeter, 'assertBalance' | 'charge'> | null;
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

export async function fetchUrlDefault(url: string): Promise<{ body: Buffer; mime: string }> {
  const u = new URL(url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ParseError('fetch_failed', 'Chỉ hỗ trợ http / https');
  const r = await fetch(u, { signal: AbortSignal.timeout(URL_TIMEOUT_MS), redirect: 'follow', headers: { 'user-agent': 'AppChatBot/1.0 (+kb)' } });
  if (!r.ok) throw new ParseError('fetch_failed', `Trang trả HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > URL_MAX_BYTES) throw new ParseError('fetch_failed', 'Trang quá lớn');
  return { body: buf, mime: r.headers.get('content-type') ?? 'text/html' };
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
    await db.$transaction(async (tx) => {
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
    const e = await d.embedder.embed(chunks.map((c) => c.content));
    // Trừ credit theo token thật của model embed — idempotent theo nguồn + lần nạp (job chạy lại không trừ hai lần).
    if (d.meter && e.tokens > 0) await d.meter.charge({ workspaceId: ws, provider: e.provider, model: e.model, tokensIn: e.tokens, tokensOut: 0, runId: `kb:${sourceId}`, stepIdx: s.ingestSeq, source: 'kb' });
    const model = `${e.provider}:${e.model}`;
    await db.$transaction(async (tx) => {
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
    if (err instanceof AppError && err.code === 'CREDIT_EXHAUSTED') return fail('Hết credit — nạp thêm rồi bấm Học lại');
    d.log.warn({ err, source: sourceId }, 'kb ingest failed');
    return fail(err instanceof Error ? `Lỗi nạp: ${err.message.slice(0, 200)}` : 'Lỗi nạp');
  }
}
