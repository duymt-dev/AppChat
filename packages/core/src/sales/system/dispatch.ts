// Bộ quét mỏng của action riêng sales (TIP-003c §4.1, §5.1): trang ID-only keyset (mốc, id) ≤ 200 theo index partial — quét hết mọi mục
// đến hạn, không đói trang đầu — mỗi ứng viên một lần gọi `runSystemAction` (trigger tất định → biên nhận). ID quét chỉ là ứng viên:
// handler đọc lại vị từ hiện tại. Lỗi một mục không chặn mục khác (onError có mã an toàn).
import { dayEndAfter } from '@appchat/shared';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { SystemOutput } from '@appchat/actions';
import { runSystemAction } from '../../kernel/actions/system';
import { localDay } from '../payments/services/payment-write';
import { reminderStep } from './payment-effects';
import { QUOTE_REMIND_DAYS } from './quote-effects';
import { invoiceOverdueTrigger, invoiceRemindTrigger, packageExpireTrigger, packageGrantTrigger, quoteExpireTrigger, quoteRemindTrigger, quoteViewTrigger } from './sources';
import type { SystemTrigger } from '../../kernel/actions/system';

export const SCAN_PAGE = 200;

export interface SalesSystemDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  tenants: Pick<TenantDbResolver, 'get'>;
  onError?: (targetId: string, err: unknown) => void;
}

type Row = { id: string; at: Date };

/** Trang keyset (at, id) > (cursor) — SQL theo index partial của từng nguồn. */
async function* pages(read: (after: Row | null) => Promise<Row[]>): AsyncGenerator<Row[]> {
  let after: Row | null = null;
  for (;;) {
    const rows = await read(after);
    if (!rows.length) return;
    yield rows;
    if (rows.length < SCAN_PAGE) return;
    after = rows[rows.length - 1]!;
  }
}

/** Chạy một trigger; trả true khi hiệu ứng MỚI đã áp / đã nhận (applied / handed_off). Biên nhận đã kết thúc → bỏ qua (không gọi
 *  Executor, không đếm lại); biên nhận còn `admitted` (crash giữa chừng) vẫn gọi để hội tụ. */
export async function runTrigger(d: SalesSystemDeps, t: SystemTrigger): Promise<boolean> {
  try {
    if (await settled(d, t)) return false;
    const r = await runSystemAction<SystemOutput>(d.executor, d.tenants, t);
    const out = (r.data as { result?: SystemOutput }).result;
    return out?.disposition === 'applied' || out?.disposition === 'handed_off';
  } catch (err) {
    d.onError?.(t.targetId, err);
    return false;
  }
}

async function settled(d: SalesSystemDeps, t: SystemTrigger): Promise<boolean> {
  const db = await d.tenants.get(TenantContexts.system(t.workspaceId, `system:${t.actionId}`));
  const [r] = await db.$queryRaw<{ phase: string }[]>`
    SELECT phase::text AS phase FROM system_action_receipt WHERE source_kind = ${t.sourceKind}::system_source_kind AND source_ref = ${t.sourceRef}
       AND action_id = ${t.actionId} AND target_id = ${t.targetId} AND target_generation = ${t.generation} AND milestone = ${t.milestone ?? ''}`;
  return !!r && r.phase !== 'admitted';
}

async function each(d: SalesSystemDeps, read: (after: Row | null) => Promise<Row[]>, trigger: (r: Row) => SystemTrigger | null): Promise<number> {
  let n = 0;
  for await (const rows of pages(read)) for (const r of rows) {
    const t = trigger(r);
    if (t && (await runTrigger(d, t))) n++;
  }
  return n;
}

const after = (a: Row | null) => (a ? { at: a.at, id: a.id } : null);

export function expireQuotes(db: TenantDb, ws: string, now: Date, d: SalesSystemDeps): Promise<number> {
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<Row[]>`SELECT id, valid_until AS at FROM quote WHERE status IN ('sent', 'viewed') AND deleted_at IS NULL AND valid_until < ${now}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (valid_until, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY valid_until, id LIMIT ${SCAN_PAGE}`;
  }, (r) => quoteExpireTrigger(ws, { id: r.id, validUntil: r.at }));
}

export function remindQuotes(db: TenantDb, ws: string, now: Date, timeZone: string, d: SalesSystemDeps): Promise<number> {
  const end = dayEndAfter(now, QUOTE_REMIND_DAYS, timeZone);
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<Row[]>`SELECT id, valid_until AS at FROM quote WHERE status IN ('sent', 'viewed') AND deleted_at IS NULL AND reminded_at IS NULL
      AND valid_until >= ${now} AND valid_until <= ${end}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (valid_until, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY valid_until, id LIMIT ${SCAN_PAGE}`;
  }, (r) => quoteRemindTrigger(ws, { id: r.id, validUntil: r.at }));
}

export function overdueInvoices(db: TenantDb, ws: string, now: Date, timeZone: string, d: SalesSystemDeps): Promise<number> {
  const today = new Date(`${localDay(now, timeZone)}T00:00:00Z`);
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<Row[]>`SELECT id, due_date AS at FROM invoice WHERE status IN ('sent', 'partial') AND due_date < ${today}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (due_date, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY due_date, id LIMIT ${SCAN_PAGE}`;
  }, (r) => invoiceOverdueTrigger(ws, { id: r.id, dueDate: r.at }));
}

export function remindInvoices(db: TenantDb, ws: string, now: Date, timeZone: string, d: SalesSystemDeps): Promise<number> {
  const day = Date.parse(`${localDay(now, timeZone)}T00:00:00Z`);
  const [from, to] = [new Date(day - 8 * 86_400_000), new Date(day + 86_400_000)];
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<Row[]>`SELECT id, due_date AS at FROM invoice WHERE status IN ('sent', 'partial', 'overdue') AND conversation_id IS NOT NULL AND due_date >= ${from} AND due_date <= ${to}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (due_date, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY due_date, id LIMIT ${SCAN_PAGE}`;
  }, (r) => {
    const step = reminderStep(r.at, now, timeZone);
    return step ? invoiceRemindTrigger(ws, { id: r.id, dueDate: r.at }, step.key) : null;
  });
}

export function expirePackages(db: TenantDb, ws: string, now: Date, d: SalesSystemDeps): Promise<number> {
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<Row[]>`SELECT id, expires_at AS at FROM customer_package WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ${now}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (expires_at, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY expires_at, id LIMIT ${SCAN_PAGE}`;
  }, (r) => packageExpireTrigger(ws, { id: r.id, expiresAt: r.at }));
}

/** Khách mở link công khai (locator đã kiểm chữ ký): ghi lần xem đầu qua action riêng. */
export const recordQuoteView = (d: SalesSystemDeps, ws: string, q: { id: string; sentAt: Date | null }) => runTrigger(d, quoteViewTrigger(ws, q));

/** Consumer `order.confirmed` (event đã lưu): cấp liệu trình qua action riêng. */
export const grantPackagesOnConfirm = (d: SalesSystemDeps, ws: string, eventId: string, orderId: string) => runTrigger(d, packageGrantTrigger(ws, eventId, orderId));
