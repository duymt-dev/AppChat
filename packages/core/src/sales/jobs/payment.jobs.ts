// Việc nền của khoản thu (TIP-032): scheduler `sales.payment-sweep` mỗi 30 phút trên queue `sales-scheduler` (cùng worker quét báo giá —
// job name riêng) — đề nghị quá hạn → overdue, nhắc công nợ T-1 / T+1 / T+7, liệu trình hết hạn + nhắc còn 1 buổi / còn 7 ngày (TIP-032b);
// consumer `sales.payment-packages` (`order.confirmed` → sinh liệu trình nếu đơn đủ điều kiện; `appointment.completed` trừ buổi → nhắc
// còn 1 buổi ngay). Lỗi một workspace không chặn workspace khác.
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { SalesSystemDeps } from '../system/dispatch';
import { expirePackages as expireDuePackages } from '../system/dispatch';
import { remindPackages, remindRemaining } from '../payments/services/package-reminders';
import { markOverdue, packagesOnConfirm, remindDue } from '../payments/services/payment-system';

export const PAYMENT_SWEEP_JOB = 'sales.payment-sweep';
export const PAYMENT_SWEEP_EVERY_MS = 30 * 60_000;

export interface PaymentSweepDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  /** TIP-003c: chuyển trạng thái chạy qua action riêng (invoice / package.system_transition) — nhắc tự đẩy hàng gửi sau commit. */
  executor: Pick<ActionExecutor, 'execute'>;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}

export async function sweepPayments(d: PaymentSweepDeps) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true, timezone: true } });
  const total = { overdue: 0, reminded: 0, expired: 0, packageReminders: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, PAYMENT_SWEEP_JOB));
      const now = d.now();
      const sys = { executor: d.executor, tenants: d.tenants, onError: (_id: string, err: unknown) => d.onError?.(w.id, err) };
      total.overdue += await markOverdue(db, w.id, now, w.timezone, sys);
      total.reminded += await remindDue(db, w.id, now, w.timezone, sys);
      total.expired += await expireDuePackages(db, w.id, now, sys);
      total.packageReminders += await remindPackages(db, w.id, now, w.timezone);
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}

export const paymentPackagesConsumer = (now: () => Date, timeZoneOf: (ws: string) => Promise<string>, sys: Omit<SalesSystemDeps, 'onError'>): EventConsumer => ({
  name: 'sales.payment-packages',
  topics: ['order.confirmed', 'appointment.completed'],
  async handle(e, db) {
    const p = e.payload as { order_id?: string; package_id?: string | null };
    // Cấp liệu trình qua action riêng — nguồn là event đã lưu (verifier đọc lại outbox), lỗi ném lại để consumer thử lại.
    if (e.topic === 'order.confirmed' && p.order_id) await packagesOnConfirm({ ...sys, onError: (_id, err) => { throw err; } }, e.workspaceId, e.id, p.order_id);
    if (e.topic === 'appointment.completed' && p.package_id) await remindRemaining(db, e.workspaceId, p.package_id, now(), await timeZoneOf(e.workspaceId));
  },
});
