// Bộ quét mỏng của `contract.system_transition` (TIP-003c §4.1, §5.1): keyset (mốc, id) ≤ 200 theo index partial; handler đọc lại vị từ
// hiện tại. Facade contract-system.ts gọi vào đây.
import { CONTRACT_RENEW_NOTICE_DAYS } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { scanDue, SCAN_PAGE, type ScanRow, type SystemRunDeps } from '../../kernel/actions/system';
import { contractToday } from './effects';
import { contractTrigger } from './sources';

export function expireLinksDue(db: TenantDb, ws: string, now: Date, d: SystemRunDeps): Promise<number> {
  return scanDue(d, (c) => db.$queryRaw<ScanRow[]>`SELECT id, sign_link_expires_at AS at FROM contract WHERE status = 'pending_signature' AND deleted_at IS NULL AND sign_link_expires_at < ${now}
      AND (${c.at}::timestamptz IS NULL OR (sign_link_expires_at, id) > (${c.at}::timestamptz, ${c.id}::uuid)) ORDER BY sign_link_expires_at, id LIMIT ${SCAN_PAGE}`,
    (r) => contractTrigger(ws, 'expire_link', { id: r.id, signLinkExpiresAt: r.at }));
}

export function renewalNoticesDue(db: TenantDb, ws: string, now: Date, timeZone: string, d: SystemRunDeps): Promise<number> {
  const d0 = contractToday(now, timeZone);
  const until = new Date(d0.getTime() + CONTRACT_RENEW_NOTICE_DAYS * 86_400_000);
  return scanDue(d, (c) => db.$queryRaw<(ScanRow & { day: string })[]>`SELECT id, (end_date::timestamp AT TIME ZONE 'UTC') AS at, end_date::text AS day FROM contract WHERE status = 'signed' AND deleted_at IS NULL AND renew_notice_at IS NULL
      AND end_date >= ${d0}::date AND end_date <= ${until}::date
      AND (${c.at}::timestamptz IS NULL OR ((end_date::timestamp AT TIME ZONE 'UTC'), id) > (${c.at}::timestamptz, ${c.id}::uuid)) ORDER BY end_date, id LIMIT ${SCAN_PAGE}`,
    (r) => contractTrigger(ws, 'renewal_notice', { id: r.id, endDate: (r as ScanRow & { day: string }).day }));
}

export function expireContractsDue(db: TenantDb, ws: string, now: Date, timeZone: string, d: SystemRunDeps): Promise<number> {
  const d0 = contractToday(now, timeZone);
  return scanDue(d, (c) => db.$queryRaw<(ScanRow & { day: string })[]>`SELECT id, (end_date::timestamp AT TIME ZONE 'UTC') AS at, end_date::text AS day FROM contract WHERE status = 'signed' AND deleted_at IS NULL AND end_date < ${d0}::date
      AND (${c.at}::timestamptz IS NULL OR ((end_date::timestamp AT TIME ZONE 'UTC'), id) > (${c.at}::timestamptz, ${c.id}::uuid)) ORDER BY end_date, id LIMIT ${SCAN_PAGE}`,
    (r) => contractTrigger(ws, 'expire_contract', { id: r.id, endDate: (r as ScanRow & { day: string }).day }));
}
