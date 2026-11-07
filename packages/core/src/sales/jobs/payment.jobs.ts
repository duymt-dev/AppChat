// Việc nền của khoản thu (TIP-032): scheduler `sales.payment-sweep` mỗi 30 phút trên queue `sales-scheduler` (cùng worker quét báo giá —
// job name riêng) — đề nghị quá hạn → overdue, nhắc công nợ T-1 / T+1 / T+7, liệu trình hết hạn + nhắc còn 1 buổi / còn 7 ngày (TIP-032b);
// consumer `sales.payment-packages` (`order.confirmed` → sinh liệu trình nếu đơn đủ điều kiện; `appointment.completed` trừ buổi → nhắc
// còn 1 buổi ngay). Lỗi một workspace không chặn workspace khác.
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { CrmMembers } from '../../crm/public';
import type { Outgoing } from '../../inbox/public';
import type { QuoteDeps } from '../quotes/services/quote-deps';
import { expireDuePackages } from '../payments/services/packages';
import { remindPackages, remindRemaining } from '../payments/services/package-reminders';
import { markOverdue, packagesOnConfirm, remindDue } from '../payments/services/payment-system';

export const PAYMENT_SWEEP_JOB = 'sales.payment-sweep';
export const PAYMENT_SWEEP_EVERY_MS = 30 * 60_000;

export interface PaymentSweepDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  quotes: QuoteDeps;
  members: CrmMembers;
  now: () => Date;
  enqueue: (ws: string, o: Outgoing) => Promise<void>;
  onError?: (ws: string, err: unknown) => void;
}

export async function sweepPayments(d: PaymentSweepDeps) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true, timezone: true } });
  const total = { overdue: 0, reminded: 0, expired: 0, packageReminders: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, PAYMENT_SWEEP_JOB));
      const now = d.now();
      total.overdue += await markOverdue(db, w.id, now, w.timezone);
      total.reminded += await remindDue(db, w.id, now, w.timezone, d.quotes, d.members, (o) => d.enqueue(w.id, o));
      total.expired += await expireDuePackages(db, w.id, now);
      total.packageReminders += await remindPackages(db, w.id, now, w.timezone);
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}

export const paymentPackagesConsumer = (now: () => Date, timeZoneOf: (ws: string) => Promise<string>): EventConsumer => ({
  name: 'sales.payment-packages',
  topics: ['order.confirmed', 'appointment.completed'],
  async handle(e, db) {
    const p = e.payload as { order_id?: string; package_id?: string | null };
    if (e.topic === 'order.confirmed' && p.order_id) await packagesOnConfirm(db, e.workspaceId, p.order_id, now());
    if (e.topic === 'appointment.completed' && p.package_id) await remindRemaining(db, e.workspaceId, p.package_id, now(), await timeZoneOf(e.workspaceId));
  },
});
