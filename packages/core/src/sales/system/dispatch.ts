// Bộ quét mỏng của action riêng sales (TIP-003c §4.1, §5.1): trang ID-only keyset (mốc, id) ≤ 200 theo index partial — quét hết mọi mục
// đến hạn, không đói trang đầu — mỗi ứng viên một lần gọi `runSystemAction` (trigger tất định → biên nhận). ID quét chỉ là ứng viên:
// handler đọc lại vị từ hiện tại. Lỗi một mục không chặn mục khác (onError có mã an toàn).
import { dayEndAfter } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { runTrigger, scanDue, SCAN_PAGE, type ScanCursor, type ScanRow, type SystemRunDeps, type SystemTrigger } from '../../kernel/actions/system';
import { localDay } from '../payments/services/payment-write';
import { reminderStep } from './payment-effects';
import { QUOTE_REMIND_DAYS } from './quote-effects';
import { invoiceOverdueTrigger, invoiceRemindTrigger, packageExpireTrigger, packageGrantTrigger, packageRemainingTrigger, quoteExpireTrigger, quoteRemindTrigger, quoteViewTrigger } from './sources';

export type SalesSystemDeps = SystemRunDeps;

const each = scanDue;
const after = (c: ScanCursor) => (c.at ? c : null);

export function expireQuotes(db: TenantDb, ws: string, now: Date, d: SalesSystemDeps): Promise<number> {
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<ScanRow[]>`SELECT id, valid_until AS at FROM quote WHERE status IN ('sent', 'viewed') AND deleted_at IS NULL AND valid_until < ${now}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (valid_until, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY valid_until, id LIMIT ${SCAN_PAGE}`;
  }, (r) => quoteExpireTrigger(ws, { id: r.id, validUntil: r.at }));
}

export function remindQuotes(db: TenantDb, ws: string, now: Date, timeZone: string, d: SalesSystemDeps): Promise<number> {
  const end = dayEndAfter(now, QUOTE_REMIND_DAYS, timeZone);
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<ScanRow[]>`SELECT id, valid_until AS at FROM quote WHERE status IN ('sent', 'viewed') AND deleted_at IS NULL AND reminded_at IS NULL
      AND valid_until >= ${now} AND valid_until <= ${end}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (valid_until, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY valid_until, id LIMIT ${SCAN_PAGE}`;
  }, (r) => quoteRemindTrigger(ws, { id: r.id, validUntil: r.at }));
}

export function overdueInvoices(db: TenantDb, ws: string, now: Date, timeZone: string, d: SalesSystemDeps): Promise<number> {
  const today = new Date(`${localDay(now, timeZone)}T00:00:00Z`);
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<ScanRow[]>`SELECT id, due_date AS at FROM invoice WHERE status IN ('sent', 'partial') AND due_date < ${today}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (due_date, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY due_date, id LIMIT ${SCAN_PAGE}`;
  }, (r) => invoiceOverdueTrigger(ws, { id: r.id, dueDate: r.at }));
}

export function remindInvoices(db: TenantDb, ws: string, now: Date, timeZone: string, d: SalesSystemDeps): Promise<number> {
  const day = Date.parse(`${localDay(now, timeZone)}T00:00:00Z`);
  const [from, to] = [new Date(day - 8 * 86_400_000), new Date(day + 86_400_000)];
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<ScanRow[]>`SELECT id, due_date AS at FROM invoice WHERE status IN ('sent', 'partial', 'overdue') AND conversation_id IS NOT NULL AND due_date >= ${from} AND due_date <= ${to}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (due_date, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY due_date, id LIMIT ${SCAN_PAGE}`;
  }, (r) => {
    const step = reminderStep(r.at, now, timeZone);
    return step ? invoiceRemindTrigger(ws, { id: r.id, dueDate: r.at }, step.key) : null;
  });
}

export function expirePackages(db: TenantDb, ws: string, now: Date, d: SalesSystemDeps): Promise<number> {
  return each(d, (a) => {
    const c = after(a);
    return db.$queryRaw<ScanRow[]>`SELECT id, expires_at AS at FROM customer_package WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ${now}
      AND (${c?.at ?? null}::timestamptz IS NULL OR (expires_at, id) > (${c?.at ?? null}::timestamptz, ${c?.id ?? null}::uuid)) ORDER BY expires_at, id LIMIT ${SCAN_PAGE}`;
  }, (r) => packageExpireTrigger(ws, { id: r.id, expiresAt: r.at }));
}

/** Khách mở link công khai (locator đã kiểm chữ ký): ghi lần xem đầu qua action riêng. */
export const recordQuoteView = (d: SalesSystemDeps, ws: string, q: { id: string; sentAt: Date | null }) => runTrigger(d, quoteViewTrigger(ws, q));

/** Consumer `order.confirmed` (event đã lưu): cấp liệu trình qua action riêng. */
export const grantPackagesOnConfirm = (d: SalesSystemDeps, ws: string, eventId: string, orderId: string) => runTrigger(d, packageGrantTrigger(ws, eventId, orderId));

/** Trigger của consumer `sales.payment-packages` từ event đã lưu (v1 + adapter v2 dùng chung): cấp gói / nhắc còn 1 buổi. */
export function paymentPackageTriggers(e: { id: string; workspaceId: string; topic: string; payload: unknown }): SystemTrigger[] {
  const p = (e.payload ?? {}) as { order_id?: string; package_id?: string | null };
  if (e.topic === 'order.confirmed' && p.order_id) return [packageGrantTrigger(e.workspaceId, e.id, p.order_id)];
  if (e.topic === 'appointment.completed' && p.package_id) return [packageRemainingTrigger(e.workspaceId, e.id, p.package_id)];
  return [];
}
