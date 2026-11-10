// Bộ quét / fanout mỏng của `ticket.system_transition` (TIP-003c §4.4, §5.1): mốc SLA theo keyset (hạn, id) ≤ 200 trên index partial;
// tin khách → ticket mới nhất của hội thoại; phản hồi → mọi ticket chưa phản hồi của hội thoại (≤ 200, mỗi ticket một biên nhận).
import type { TenantDb } from '@appchat/db';
import { runTrigger, scanDue, SCAN_PAGE, type ScanRow, type SystemRunDeps } from '../../kernel/actions/system';
import { messageTrigger, slaTrigger } from './sources';

type SlaRow = ScanRow & { ttr: Date; frt: Date };
const row = (r: ScanRow) => r as SlaRow;

export async function sweepSlaDue(db: TenantDb, ws: string, now: Date, d: SystemRunDeps): Promise<{ warned: number; breached: number }> {
  const ttr = await scanDue(d, (c) => db.$queryRaw<SlaRow[]>`SELECT id, ttr_due_at AS at, ttr_due_at AS ttr, frt_due_at AS frt FROM ticket WHERE status IN ('open', 'in_progress') AND breached_at IS NULL AND ttr_due_at < ${now}
      AND (${c.at}::timestamptz IS NULL OR (ttr_due_at, id) > (${c.at}::timestamptz, ${c.id}::uuid)) ORDER BY ttr_due_at, id LIMIT ${SCAN_PAGE}`,
    (r) => slaTrigger(ws, 'ttr_breach', { id: r.id, ttrDueAt: row(r).ttr, frtDueAt: row(r).frt }));
  const frt = await scanDue(d, (c) => db.$queryRaw<SlaRow[]>`SELECT id, frt_due_at AS at, ttr_due_at AS ttr, frt_due_at AS frt FROM ticket WHERE status <> 'closed' AND first_response_at IS NULL AND frt_breached_at IS NULL AND frt_due_at < ${now}
      AND (${c.at}::timestamptz IS NULL OR (frt_due_at, id) > (${c.at}::timestamptz, ${c.id}::uuid)) ORDER BY frt_due_at, id LIMIT ${SCAN_PAGE}`,
    (r) => slaTrigger(ws, 'frt_breach', { id: r.id, ttrDueAt: row(r).ttr, frtDueAt: row(r).frt }));
  // Sắp đến hạn: ứng viên chưa quá hạn; handler tự kiểm ngưỡng 80% (span hiện tại).
  const warned = await scanDue(d, (c) => db.$queryRaw<SlaRow[]>`SELECT id, ttr_due_at AS at, ttr_due_at AS ttr, frt_due_at AS frt FROM ticket WHERE status IN ('open', 'in_progress') AND warned_at IS NULL AND ttr_due_at >= ${now}
      AND ${now} - ttr_start_at >= (ttr_due_at - ttr_start_at) * 0.8
      AND (${c.at}::timestamptz IS NULL OR (ttr_due_at, id) > (${c.at}::timestamptz, ${c.id}::uuid)) ORDER BY ttr_due_at, id LIMIT ${SCAN_PAGE}`,
    (r) => slaTrigger(ws, 'sla_warning', { id: r.id, ttrDueAt: row(r).ttr, frtDueAt: row(r).frt }));
  return { warned, breached: ttr + frt };
}

/** Tin khách (event đã lưu) → ticket mới nhất của hội thoại. */
export async function customerMessageToTicket(db: TenantDb, ws: string, conversationId: string, messageId: string, d: SystemRunDeps): Promise<boolean> {
  const t = await db.ticket.findFirst({ where: { conversationId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
  return t ? runTrigger(d, messageTrigger(ws, 'customer_message', t.id, messageId)) : false;
}

/** Phản hồi (người / agent) → chốt phản hồi đầu cho từng ticket chưa phản hồi của hội thoại. */
export async function firstResponseToTickets(db: TenantDb, ws: string, conversationId: string, messageId: string, d: SystemRunDeps): Promise<number> {
  const rows = await db.ticket.findMany({ where: { conversationId, status: { not: 'closed' }, firstResponseAt: null }, select: { id: true }, orderBy: { id: 'asc' }, take: SCAN_PAGE });
  let n = 0;
  for (const r of rows) if (await runTrigger(d, messageTrigger(ws, 'first_response', r.id, messageId))) n++;
  return n;
}
