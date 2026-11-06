// Lịch sử ví có lọc phía server (TIP-039 pha 3, AC07): `GET /v1/billing/ledger?cursor&limit&kind&dir&source&from&to` — lọc TRƯỚC LIMIT
// (không lọc 50 dòng ở FE rồi bỏ bản ghi), sắp `created_at desc, id desc`, keyset cursor. Hai bước (deferred join — indexing §3): chọn
// id bounded theo index (workspace, [source / kind], created_at, id) rồi mới đọc note / meta (JSON) cho đúng một trang. Tham số kiểm chặt:
// kind ∈ enum, dir ∈ in | out, source = khoá nhãn (chữ thường, ≤ 32), from / to = ngày ISO theo lịch workspace (mốc tính ở JS — Q-053),
// cursor hợp lệ — không ghép SQL từ input.
import { AppError, wallToUtc } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';

export const LEDGER_PAGE = 50;
const KINDS = ['grant', 'topup', 'usage', 'refund', 'adjust', 'expire'] as const;
type Kind = (typeof KINDS)[number];

export interface LedgerFilter {
  kind?: Kind;
  dir?: 'in' | 'out';
  source?: string;
  from?: Date;
  /** Mốc cuối loại trừ (đầu ngày sau `to`). */
  to?: Date;
}

export type LedgerRow = {
  id: string;
  kind: string;
  delta: bigint;
  note: string | null;
  meta: unknown;
  source: string | null;
  createdAt: Date;
};

export const encodeCursor = (r: { createdAt: Date; id: string }) =>
  Buffer.from(`${r.createdAt.toISOString()}|${r.id}`).toString('base64url');
export const decodeCursor = (c: string) => {
  const [at, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  const d = new Date(at ?? '');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || Number.isNaN(d.getTime()))
    throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
  return { at: d, id };
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Ngày `YYYY-MM-DD` theo lịch workspace → mốc UTC đầu ngày (+ `plus` ngày). Ngày không có thật (30/02) → 400. */
const day = (v: string, field: string, timeZone: string, plus = 0) => {
  if (!DATE.test(v)) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v)
    throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return wallToUtc(new Date(d.getTime() + plus * 86_400_000).toISOString().slice(0, 10), '00:00', timeZone);
};

/** Query string → bộ lọc đã kiểm (400 `VALIDATION_FAILED` kèm ô lỗi). */
export function parseLedgerFilter(
  q: { kind?: string; dir?: string; source?: string; from?: string; to?: string },
  timeZone = 'Asia/Ho_Chi_Minh',
): LedgerFilter {
  const f: LedgerFilter = {};
  if (q.kind) {
    if (!(KINDS as readonly string[]).includes(q.kind))
      throw new AppError('VALIDATION_FAILED', 400, { kind: 'invalid' });
    f.kind = q.kind as Kind;
  }
  if (q.dir) {
    if (q.dir !== 'in' && q.dir !== 'out') throw new AppError('VALIDATION_FAILED', 400, { dir: 'invalid' });
    f.dir = q.dir;
  }
  if (q.source) {
    if (!/^[a-z_]{1,32}$/.test(q.source)) throw new AppError('VALIDATION_FAILED', 400, { source: 'invalid' });
    f.source = q.source;
  }
  if (q.from) f.from = day(q.from, 'from', timeZone);
  if (q.to) f.to = day(q.to, 'to', timeZone, 1);
  if (f.from && f.to && f.from >= f.to) throw new AppError('VALIDATION_FAILED', 400, { to: 'before_from' });
  return f;
}

/** Một trang sổ ví theo bộ lọc: id trước (index), hydrate sau. */
export async function readLedger(
  db: Pick<PlatformDb, 'creditLedger'>,
  workspaceId: string,
  f: LedgerFilter,
  cursor: string | undefined,
  limit = LEDGER_PAGE,
): Promise<{ rows: LedgerRow[]; next: string | null }> {
  const take = Math.min(Math.max(limit, 1), 100);
  const c = cursor ? decodeCursor(cursor) : null;
  const where = {
    workspaceId,
    ...(f.kind ? { kind: f.kind } : {}),
    ...(f.source ? { source: f.source } : {}),
    ...(f.dir === 'in' ? { delta: { gt: 0n } } : f.dir === 'out' ? { delta: { lt: 0n } } : {}),
    ...(f.from || f.to
      ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) } }
      : {}),
    ...(c ? { AND: [{ OR: [{ createdAt: { lt: c.at } }, { createdAt: c.at, id: { lt: c.id } }] }] } : {}),
  };
  const ids = await db.creditLedger.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    select: { id: true, createdAt: true },
  });
  const page = ids.slice(0, take);
  const full = page.length
    ? await db.creditLedger.findMany({
        where: { workspaceId, id: { in: page.map((r) => r.id) } },
        select: { id: true, kind: true, delta: true, note: true, meta: true, source: true, createdAt: true },
      })
    : [];
  const byId = new Map(full.map((r) => [r.id, r]));
  return {
    rows: page.map((r) => byId.get(r.id)!).filter(Boolean),
    next: ids.length > take ? encodeCursor(page[page.length - 1]!) : null,
  };
}
