// Bộ quét mỏng của `appointment.system_transition` (TIP-003c §4.1, §5.1): keyset (mốc, id) ≤ 200 theo index partial; mốc nhắc tính
// từ giờ hẹn hiện tại (handler đọc lại). Facade booking-system.ts gọi vào đây.
import { dueReminder } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { scanDue, SCAN_PAGE, type ScanRow, type SystemRunDeps } from '../../kernel/actions/system';
import { appointmentRemindTrigger, holdExpireTrigger } from './sources';

export function expireHoldsDue(db: TenantDb, ws: string, now: Date, d: SystemRunDeps): Promise<number> {
  return scanDue(d, (c) => db.$queryRaw<ScanRow[]>`SELECT id, hold_expires_at AS at FROM appointment WHERE status = 'pending' AND deleted_at IS NULL AND hold_expires_at <= ${now}
      AND (${c.at}::timestamptz IS NULL OR (hold_expires_at, id) > (${c.at}::timestamptz, ${c.id}::uuid)) ORDER BY hold_expires_at, id LIMIT ${SCAN_PAGE}`,
    (r) => holdExpireTrigger(ws, { id: r.id, holdExpiresAt: r.at }));
}

export function remindAppointmentsDue(db: TenantDb, ws: string, now: Date, d: SystemRunDeps): Promise<number> {
  const until = new Date(now.getTime() + 24 * 3_600_000);
  return scanDue(d, (c) => db.$queryRaw<(ScanRow & { sent: { key: string }[] })[]>`SELECT id, start_at AS at, reminders_sent AS sent FROM appointment WHERE status IN ('pending', 'confirmed') AND deleted_at IS NULL
      AND start_at > ${now} AND start_at <= ${until}
      AND (${c.at}::timestamptz IS NULL OR (start_at, id) > (${c.at}::timestamptz, ${c.id}::uuid)) ORDER BY start_at, id LIMIT ${SCAN_PAGE}`,
    (r) => {
      const step = dueReminder(r.at, now, ((r as ScanRow & { sent: { key: string }[] }).sent ?? []).map((s) => s.key));
      return step ? appointmentRemindTrigger(ws, { id: r.id, startAt: r.at }, step.key) : null;
    });
}
