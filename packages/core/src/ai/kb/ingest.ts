// Nạp một nguồn tri thức (rag §5, queue `kb-ingest` ở worker ROLE=ai): lấy nội dung (tệp ở Storage / URL / văn bản) → parse → cắt đoạn
// → embed theo lô (router purpose `embed`, trừ credit theo `model_price` — nguồn ví `kb`) NGOÀI transaction → action riêng `kb.system_publish`
// thay toàn bộ đoạn cũ trong MỘT transaction → `ready` + `kb.source_ready`. Lỗi → `failed` + lý do + `kb.source_failed`. Idempotent: nguồn đã xoá / không ở `pending` |
// `processing` thì bỏ; `learn=false` → `ready`, 0 đoạn, không gọi model. Không giữ gì trong RAM giữa các lần.
import { chunkDocument, type Embedder } from '@appchat/ai';
import type { TenantDb, TenantDbResolver } from '@appchat/db';
import type { SystemOutput } from '@appchat/actions';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { runSystemAction } from '../../kernel/actions/system';
import { withCandidate, type KbCandidate } from './system/candidates';
import { kbPublishTrigger } from './system/sources';
import type { CreditMeter } from '../../billing/public';
import type { FilesService } from '../../kernel/files/files.service';
import type { AppLogger } from '../../kernel/logger/logger';
import { FetchLimitError, safeFetch, UrlRefusedError } from '../../kernel/http/safe-fetch';
import { ParseError, parseDocument } from './parse';
import { embedChunks } from './ingest-usage';

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
  /** TIP-003c: công bố kết quả qua action riêng `kb.system_publish` (Executor tự đánh dấu outbox). */
  executor: Pick<ActionExecutor, 'execute'>;
  tenants: Pick<TenantDbResolver, 'get'>;
  /** Tải URL (test thay bằng bản giả). */
  fetchUrl?: (url: string) => Promise<{ body: Buffer; mime: string }>;
}

export type IngestOutcome = { status: 'ready'; chunks: number } | { status: 'failed'; error: string } | { status: 'skipped' };

type Db = Pick<TenantDb, 'kbSource' | 'file'>;

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
  // Giành nguồn (bookkeeping): pending | processing (job chạy lại sau khi worker chết) → processing. Đã xoá / ready / failed → bỏ.
  const claimed = await db.kbSource.updateMany({ where: { id: sourceId, deletedAt: null, status: { in: ['pending', 'processing'] } }, data: { status: 'processing', error: null } });
  if (!claimed.count) return { status: 'skipped' };
  const s = (await db.kbSource.findUnique({ where: { id: sourceId } }))!;
  const c = await candidateOf(db, ws, s, d);
  // TIP-003c §4.6: công bố qua action riêng `kb.system_publish` đúng lần nạp hiện hành — học lại / xoá trong lúc embed → no_effect.
  const op = c.kind === 'ready' ? 'publish_ready' : c.kind === 'failed' ? 'publish_failed' : 'publish_unlearned';
  let res: SystemOutput;
  try {
    const r = await withCandidate(ws, sourceId, s.ingestSeq, c, () => runSystemAction<SystemOutput>(d.executor, d.tenants, kbPublishTrigger(ws, op, sourceId, s.ingestSeq)));
    res = (r.data as { result: SystemOutput }).result;
  } catch (err) {
    if ((err as { status?: number })?.status === 409) return { status: 'skipped' };
    throw err;
  }
  if (res.disposition !== 'applied') return { status: 'skipped' };
  return c.kind === 'failed' ? { status: 'failed', error: c.error } : { status: 'ready', chunks: c.kind === 'ready' ? c.chunks.length : 0 };
}

/** Parse + embed NGOÀI transaction (019b đo theo lần nạp) → ứng viên công bố. Lỗi nghiệp vụ → ứng viên `failed` (không ném). */
async function candidateOf(db: Db, ws: string, s: { id: string; kind: string; fileId: string | null; url: string | null; body: string | null; learn: boolean; ingestSeq: number; name: string }, d: IngestDeps): Promise<KbCandidate> {
  const failed = (error: string): KbCandidate => ({ kind: 'failed', error: error.slice(0, 300) });
  if (!s.learn) return { kind: 'unlearned' };
  try {
    const src = await contentOf(db, d, s);
    const chunks = chunkDocument(await parseDocument(src.kind, src.body));
    if (!d.embedder) return failed('Chưa cấu hình model embedding');
    await d.meter?.assertBalance(ws);
    const e = await embedChunks(db, ws, { id: s.id, seq: s.ingestSeq, name: s.name }, chunks.map((c) => c.content), { embedder: d.embedder, meter: d.meter, now: d.now });
    return { kind: 'ready', model: `${e.provider}:${e.model}`, chunks: chunks.map((c, i) => ({ content: c.content, tokens: c.tokens, meta: c.meta, vector: e.vectors[i]! })) };
  } catch (err) {
    if (err instanceof ParseError) return failed(err.message);
    if ((err as { code?: string })?.code === 'CREDIT_EXHAUSTED') return failed('Hết credit — nạp thêm rồi bấm Học lại');
    if ((err as { code?: string })?.code === 'USAGE_UNKNOWN') return failed('Lời gọi embedding chưa rõ kết quả — chờ đối soát rồi bấm Học lại');
    d.log.warn({ err, source: s.id }, 'kb ingest failed');
    return failed(err instanceof Error ? `Lỗi nạp: ${err.message.slice(0, 200)}` : 'Lỗi nạp');
  }
}
