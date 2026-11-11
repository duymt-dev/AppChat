// Việc nền của khoản thu (TIP-032): scheduler `sales.payment-sweep` mỗi 30 phút trên queue `sales-scheduler` (cùng worker quét báo giá —
// job name riêng) — đề nghị quá hạn → overdue, nhắc công nợ T-1 / T+1 / T+7, liệu trình hết hạn + nhắc còn 1 buổi / còn 7 ngày (TIP-032b);
// consumer `sales.payment-packages` (`order.confirmed` → sinh liệu trình nếu đơn đủ điều kiện; `appointment.completed` trừ buổi → nhắc
// còn 1 buổi ngay — TIP-003c: `package.system_transition` op `remind_remaining`). Lỗi một workspace không chặn workspace khác.
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { SalesSystemDeps } from '../system/dispatch';
import { expirePackages as expireDuePackages } from '../system/dispatch';
import { remindPackages } from '../payments/services/package-reminders';
import { markOverdue, remindDue } from '../payments/services/payment-system';
import { paymentPackageTriggers } from '../system/dispatch';
import { runTrigger } from '../../kernel/actions/system';

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

export const PAYMENT_PACKAGES_CONSUMER = 'sales.payment-packages';
export const PAYMENT_PACKAGES_TOPICS = ['order.confirmed', 'appointment.completed'] as const;

/** Cấp liệu trình / nhắc còn 1 buổi qua action riêng — nguồn là event đã lưu (verifier đọc lại outbox), lỗi ném lại để consumer thử lại. */
export const paymentPackagesConsumer = (sys: Omit<SalesSystemDeps, 'onError'>): EventConsumer => ({
  name: PAYMENT_PACKAGES_CONSUMER,
  topics: PAYMENT_PACKAGES_TOPICS,
  async handle(e) {
    for (const t of paymentPackageTriggers(e)) await runTrigger({ ...sys, onError: (_id, err) => { throw err; } }, t);
  },
});
