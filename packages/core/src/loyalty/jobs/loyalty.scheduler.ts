// Lịch loyalty (TIP-036, COMMERCE §7): mỗi workspace đang hoạt động — (1) hết hạn FIFO: khách có lô quá hạn còn số dư → `loyalty.expire`;
// (2) xét hạng đầu quý theo giờ workspace: cửa sổ = 12 tháng trước mốc đầu quý (00:00 ngày 1 tháng đầu quý), mỗi khách có điểm tích hoặc
// đang có hạng ≠ Thành viên → `loyalty.review_tier`. Gọi qua ActionExecutor nguồn system. Chạy lại / sau restart an toàn: lô đã hết hạn về 0
// (không lấy lại; Idempotency-Key theo bucket giờ + khách), xét hạng ghi mốc quý đã xong ở `loyalty_config.tier_reviewed` → bỏ qua; dừng giữa chừng → lần sau chạy tiếp (xét lại
// cùng hạng là no-op). Lỗi một workspace / khách không chặn phần còn lại.
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { quarterStart, utcToWall, wallToUtc } from '@appchat/shared';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { loyaltySystemCtx } from '../events/order-consumer';

export const LOYALTY_SCHEDULER_QUEUE = 'loyalty-scheduler';
export const LOYALTY_SWEEP_JOB = 'loyalty.sweep';
export const LOYALTY_SWEEP_EVERY_MS = 60 * 60_000;
const BATCH = 200;

export interface LoyaltySweepDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  executor: Pick<ActionExecutor, 'execute'>;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}

/** Mốc xét hạng của quý chứa `now` (giờ workspace): đầu quý + cửa sổ 12 tháng trước đó. */
export function reviewWindow(now: Date, timeZone: string, months = 12): { quarter: string; from: Date; to: Date } {
  const quarter = quarterStart(utcToWall(now, timeZone).date);
  const [y, m] = quarter.split('-').map(Number) as [number, number];
  const back = new Date(Date.UTC(y, m - 1 - months, 1));
  const fromDay = `${back.getUTCFullYear()}-${String(back.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { quarter, from: wallToUtc(fromDay, '00:00', timeZone), to: wallToUtc(quarter, '00:00', timeZone) };
}

/** Khách có lô quá hạn còn số dư (index loyalty_ledger_expiry_idx) — theo lô, gộp theo khách. */
async function dueContacts(db: TenantDb, now: Date): Promise<string[]> {
  const r = await db.$queryRaw<{ contact_id: string }[]>`
    SELECT DISTINCT contact_id FROM (
      SELECT contact_id FROM loyalty_ledger WHERE remaining > 0 AND expires_at <= ${now} ORDER BY expires_at, id LIMIT ${BATCH * 5}
    ) t`;
  return r.map((x) => x.contact_id);
}

export async function expireDue(db: TenantDb, ws: string, d: Pick<LoyaltySweepDeps, 'executor' | 'now'>, onError?: (err: unknown) => void): Promise<number> {
  let n = 0;
  const now = d.now();
  const bucket = now.toISOString().slice(0, 13);
  for (const id of await dueContacts(db, now)) {
    try {
      const r = await d.executor.execute<{ status: string }>(loyaltySystemCtx(ws, `expire:${id}:${bucket}`), 'loyalty.expire', { contact_id: id });
      if ((r.data as { result?: { status?: string } }).result?.status === 'posted') n++;
    } catch (err) {
      onError?.(err);
    }
  }
  return n;
}

/** Xét hạng một lần mỗi quý: duyệt khách theo id (keyset), mốc quý ghi sau khi duyệt hết. */
export async function reviewTiers(db: TenantDb, ws: string, timeZone: string, d: Pick<LoyaltySweepDeps, 'executor' | 'now'>, onError?: (err: unknown) => void): Promise<number> {
  const w = reviewWindow(d.now(), timeZone);
  const conf = await db.loyaltyConfig.findUnique({ where: { id: 1 }, select: { tierReviewed: true } });
  if (conf?.tierReviewed === w.quarter) return 0;
  let changed = 0;
  let after = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT c.id FROM contact c WHERE c.deleted_at IS NULL AND c.id > ${after}::uuid
        AND (c.tier_key IS NOT NULL AND c.tier_key <> 'member'
          OR EXISTS (SELECT 1 FROM loyalty_ledger l WHERE l.contact_id = c.id AND l.kind IN ('earn', 'adjust') AND l.delta > 0 AND l.created_at >= ${w.from} AND l.created_at < ${w.to}))
      ORDER BY c.id LIMIT ${BATCH}`;
    for (const r of rows) {
      try {
        const out = await d.executor.execute(loyaltySystemCtx(ws, `tier:${r.id}:${w.quarter}`), 'loyalty.review_tier', { contact_id: r.id, quarter: w.quarter, window_from: w.from.toISOString(), window_to: w.to.toISOString() });
        if ((out.data as { result?: { changed?: boolean } }).result?.changed) changed++;
      } catch (err) {
        onError?.(err);
      }
    }
    if (rows.length < BATCH) break;
    after = rows[rows.length - 1]!.id;
  }
  await db.loyaltyConfig.update({ where: { id: 1 }, data: { tierReviewed: w.quarter } });
  return changed;
}

export async function sweepLoyalty(d: LoyaltySweepDeps) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true, timezone: true } });
  const total = { expired: 0, tiers: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, LOYALTY_SWEEP_JOB));
      const err = (e: unknown) => d.onError?.(w.id, e);
      total.expired += await expireDue(db, w.id, d, err);
      total.tiers += await reviewTiers(db, w.id, w.timezone, d, err);
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}
