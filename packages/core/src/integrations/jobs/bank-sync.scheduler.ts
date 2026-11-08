// Quét 60 giây của runtime kết nối (TIP-012b §4.3–4.5) trên queue riêng `integration-ops-scheduler` (jobId cố định → một lịch dù nhiều
// worker), ROLE=jobs: (1) KHÔI PHỤC biên nhận còn việc đã đến hạn (job mất / worker chết giữa chừng — lease hết) → đẩy lại; (2) KÉO TỰ
// ĐỘNG cho kết nối đã chọn bật (có `bank_pull_state`), live, adapter có `pull`, feed tài chính đang bật, đến hạn → một biên nhận mỗi
// cửa sổ (ref `auto:<mốc>` — nhiều worker cùng quét vẫn một lượt). Lỗi một workspace không chặn workspace khác.
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { connectorRegistry } from '@appchat/integrations';
import { BANK_PULL_OP, activeFeed } from '../operations/bank-pull';
import { upsertCall } from '../operations/call-receipt';
import { capabilitiesOf } from '../services/connection-health';

export const OPS_SCHEDULER_QUEUE = 'integration-ops-scheduler';
export const OPS_SWEEP_JOB = 'integration.ops-sweep';
export const SWEEP_EVERY_MS = 60_000;
const BATCH = 200;

export interface SweepDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  enqueue: (ws: string, callId: string, at: Date | null) => Promise<void>;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}

/** Biên nhận còn việc đã đến hạn (index partial `integration_call_log_pending_idx`). */
async function recover(db: TenantDb, ws: string, d: SweepDeps): Promise<number> {
  const due = await db.integrationCallLog.findMany({ where: { nextAttemptAt: { lte: d.now() } }, orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }], take: BATCH, select: { id: true, nextAttemptAt: true } });
  for (const c of due) await d.enqueue(ws, c.id, c.nextAttemptAt);
  return due.length;
}

/** Kéo tự động đến hạn (index `bank_pull_state_due_idx`). */
async function schedulePulls(db: TenantDb, ws: string, d: SweepDeps): Promise<number> {
  const now = d.now();
  const due = await db.bankPullState.findMany({ where: { nextPullAt: { lte: now } }, orderBy: { nextPullAt: 'asc' }, take: BATCH });
  let n = 0;
  for (const s of due) {
    const conn = await db.integrationConnection.findUnique({ where: { id: s.connectionId } });
    if (!conn || conn.status === 'disconnected' || conn.mode !== 'live' || !capabilitiesOf(connectorRegistry.get(conn.connectorKey), conn.mode).pull) continue;
    if (!(await activeFeed(db, conn.id))) continue;
    const busy = await db.integrationCallLog.findFirst({ where: { connectionId: conn.id, op: BANK_PULL_OP, nextAttemptAt: { not: null } }, select: { id: true } });
    if (busy) continue;
    const { row, created } = await upsertCall(
      db,
      { connectionId: conn.id, op: BANK_PULL_OP, refId: `auto:${s.nextPullAt.toISOString()}`, refType: 'scheduler', configRev: conn.credentialRev, safety: 'read', requestedBy: 'scheduler' },
      now,
    );
    if (created) {
      await d.enqueue(ws, row.id, row.nextAttemptAt);
      n++;
    }
  }
  return n;
}

export async function sweepIntegrationOps(d: SweepDeps) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const total = { recovered: 0, scheduled: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, OPS_SWEEP_JOB));
      total.recovered += await recover(db, w.id, d);
      total.scheduled += await schedulePulls(db, w.id, d);
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}
