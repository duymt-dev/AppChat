// Lịch chụp / dọn quan sát tồn ticket (TIP-034d §2.3) — job `support.stock-observe` mỗi 15 phút trên CÙNG queue `support-scheduler` và
// CÙNG worker của SupportJobsRunner (một consumer — không lấn job quét SLA). Liệt kê workspace đang hoạt động theo trang 100 id (keyset),
// tối đa 4 tenant song song; lỗi một workspace không chặn workspace khác. Log chỉ id workspace / job / lần chụp + thời gian.
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import type { SlaCalendar } from '../services/sla-clock';
import { captureStock } from './snapshot';
import { pruneStockBatch } from './cleanup';
import { isMissingStockSchema } from './control';

export const STOCK_OBSERVE_JOB = 'support.stock-observe';
export const STOCK_OBSERVE_EVERY_MS = 15 * 60_000;
const PAGE = 100;
const PARALLEL = 4;

export interface StockObserveDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  cal: Pick<SlaCalendar, 'of'>;
  now: () => Date;
  log: Pick<AppLogger, 'info' | 'warn'>;
}

/** Workspace đang hoạt động theo trang id (keyset) — không nạp danh sách không giới hạn. */
async function* activeWorkspaces(platform: StockObserveDeps['platform']): AsyncGenerator<string[]> {
  let after: string | undefined;
  for (;;) {
    const page = await platform.workspace.findMany({ where: { dbStatus: 'active', ...(after ? { id: { gt: after } } : {}) }, select: { id: true }, orderBy: { id: 'asc' }, take: PAGE });
    if (!page.length) return;
    yield page.map((w) => w.id);
    after = page.at(-1)!.id;
    if (page.length < PAGE) return;
  }
}

/** Chụp ngày hiện tại + dọn một lô cho một workspace. */
export async function observeWorkspace(d: StockObserveDeps, ws: string) {
  const started = d.now().getTime();
  const db = await d.tenants.get(TenantContexts.system(ws, STOCK_OBSERVE_JOB));
  // Múi giờ đọc từ DB nền tảng NGOÀI transaction tenant; đổi múi giờ sau đó → lần chụp gắn nhãn cũ không bao giờ được chọn khi đọc.
  const { timeZone } = await d.cal.of(ws);
  try {
    const r = await captureStock(db, timeZone, d.now);
    const p = await pruneStockBatch(db, d.now());
    if (r.status === 'captured' || p.batches || p.results)
      d.log.info({ job: STOCK_OBSERVE_JOB, ws, batch: r.batchId, rows: r.rows, pruned: p.batches, results: p.results, ms: d.now().getTime() - started }, 'quan sát tồn ticket');
    return r;
  } catch (err) {
    if (isMissingStockSchema(err)) return { status: 'skipped' as const, localDate: '' };
    throw err;
  }
}

/** Một lượt cho mọi workspace: trang 100 id, mỗi lần tối đa 4 workspace song song, lỗi cô lập theo workspace. */
export async function observeAll(d: StockObserveDeps): Promise<{ captured: number; failed: number }> {
  const total = { captured: 0, failed: 0 };
  for await (const page of activeWorkspaces(d.platform)) {
    for (let i = 0; i < page.length; i += PARALLEL) {
      const rs = await Promise.allSettled(page.slice(i, i + PARALLEL).map((ws) => observeWorkspace(d, ws)));
      rs.forEach((r, k) => {
        if (r.status === 'fulfilled') total.captured += r.value.status === 'captured' ? 1 : 0;
        else {
          total.failed++;
          d.log.warn({ err: r.reason, ws: page[i + k], job: STOCK_OBSERVE_JOB }, 'quan sát tồn ticket lỗi ở workspace');
        }
      });
    }
  }
  return total;
}
