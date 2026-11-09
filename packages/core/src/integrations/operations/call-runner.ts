// Runner chung của biên nhận lệnh gọi ra ngoài (TIP-012b §4.4–4.5): mỗi `op` khai độ an toàn (`read` thử lại được / `mutation` lỗi giữa
// chừng → unknown) + hàm chạy. Một lượt: claim CAS → đọc kết nối HIỆN TẠI (ngắt / đổi khoá → cancelled, không gọi ra ngoài) → chạy NGOÀI
// mọi transaction → ghi kết quả theo thế hệ. Lỗi lưu MÃ đã làm sạch (ProviderError code / `internal`), không thông điệp provider.
// Queue `integration-ops` chỉ mang (workspace, call_id) — không bí mật / payload / quyền; quét khôi phục ở bank-sync.scheduler.ts.
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { isProviderError, type ConnectionCtx, type ConnectorAdapter, type ConnectorRegistry, type MailTransports, type ProviderHttp } from '@appchat/integrations';
import { Queue } from '../../kernel/jobs/with-job-context';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { connectionCtx } from '../services/connections.service';
import { adapterOf } from '../services/adapter-selection';
import { MAX_ATTEMPTS, backoffAt, claimCall, finishCall, retryCall, type CallRow, type CallSafety } from './call-receipt';

export const INTEGRATION_OPS_QUEUE = 'integration-ops';

export interface OpRunArgs {
  db: TenantDb;
  workspaceId: string;
  call: CallRow;
  conn: ConnectionCtx;
  connectorKey: string;
  adapter: ConnectorAdapter | null;
  http: ProviderHttp;
  /** TIP-012c: cầu mạng mail của DN (safeFetch POST / SMTP ghim IP) — op mail dùng; op khác bỏ qua. */
  mail?: MailTransports;
  now: () => Date;
}

export interface CallOpSpec {
  safety: CallSafety;
  /** Trả kết quả an toàn (đếm) — ném ProviderError cho lỗi provider. */
  run(a: OpRunArgs): Promise<Record<string, number | string | boolean>>;
}

const OPS = new Map<string, CallOpSpec>();
export const registerCallOp = (op: string, spec: CallOpSpec) => void OPS.set(op, spec);
export const unregisterCallOp = (op: string) => void OPS.delete(op);
export const callOpSafety = (op: string): CallSafety | null => OPS.get(op)?.safety ?? null;

export interface RunnerDeps {
  tenants: TenantDbResolver;
  registry: ConnectorRegistry;
  key: Buffer;
  http: ProviderHttp;
  mail?: MailTransports;
  kv: KeyValueStore | null;
  now: () => Date;
}

export type RunResult = 'succeeded' | 'retry' | 'failed' | 'unknown' | 'cancelled' | 'skipped';

/** Lỗi được phép thử lại (chỉ op `read`): giới hạn tốc độ / quá giờ / provider tạm lỗi. */
const TRANSIENT = new Set(['rate_limited', 'timeout', 'provider_unavailable']);

/** Một lượt chạy biên nhận `callId` (worker gọi; test gọi trực tiếp). */
export async function executeCall(d: RunnerDeps, workspaceId: string, callId: string): Promise<RunResult> {
  const db = await d.tenants.get(TenantContexts.system(workspaceId, 'integrations:call'));
  const claimed = await claimCall(db, callId, d.now());
  if (!claimed) return 'skipped';
  const { generation, row } = claimed;
  const spec = OPS.get(row.op);
  const conn = await db.integrationConnection.findUnique({ where: { id: row.connectionId } });
  if (!spec || !conn || conn.status === 'disconnected' || (row.configRev !== null && row.configRev !== conn.credentialRev)) {
    await finishCall(db, callId, generation, { status: 'cancelled', error: spec ? 'superseded' : 'unsupported_op' }, d.now());
    return 'cancelled';
  }
  const started = Date.now();
  try {
    const outcome = await spec.run({
      db,
      workspaceId,
      call: row,
      conn: connectionCtx(conn, d.key),
      connectorKey: conn.connectorKey,
      adapter: adapterOf(d.registry, conn.connectorKey, conn.mode),
      http: d.http,
      ...(d.mail ? { mail: d.mail } : {}),
      now: d.now,
    });
    const ok = await finishCall(db, callId, generation, { status: 'succeeded', latencyMs: Date.now() - started, outcome }, d.now());
    return ok ? 'succeeded' : 'skipped';
  } catch (e) {
    const code = isProviderError(e) ? e.code : 'internal';
    const latencyMs = Date.now() - started;
    if (spec.safety === 'read' && TRANSIENT.has(code) && row.attempts < MAX_ATTEMPTS) {
      await retryCall(db, callId, generation, backoffAt(d.now(), row.attempts, isProviderError(e) ? e.retryAfterS : undefined), code, d.now());
      return 'retry';
    }
    // Ghi ra ngoài không rõ đã tới provider chưa → unknown (không thử mù). Đọc hết lượt / lỗi xác thực → failed.
    const status = spec.safety === 'mutation' && code !== 'auth_failed' && code !== 'unsupported' ? 'unknown' : 'failed';
    if (!(await finishCall(db, callId, generation, { status, error: code, latencyMs }, d.now()))) return 'skipped';
    await db.$transaction(async (tx) => {
      await tx.integrationConnection.updateMany({ where: { id: conn.id, credentialRev: conn.credentialRev, status: { not: 'disconnected' } }, data: { lastError: code } });
      await writeOutbox(tx, workspaceId, [{ topic: 'integration.error', payload: { connection_id: conn.id, connector_key: conn.connectorKey, op: row.op, error: code } }], d.now());
    });
    if (d.kv) await markDirty(d.kv, workspaceId);
    return status;
  }
}

export interface OpsJob {
  ws: string;
  call_id: string;
}

/**
 * Producer: một job mỗi (biên nhận, lịch thử). jobId theo `next_attempt_at` của biên nhận — đẩy lại cùng lịch không nhân đôi, lịch mới (thử
 * lại / lease hết) là job mới (job cũ đã completed không chặn). Claim CAS mới là khoá chống chạy đôi, không phải jobId.
 */
export class IntegrationOps {
  constructor(private readonly queue: Queue) {}
  async enqueue(ws: string, callId: string, at?: Date | null): Promise<void> {
    const delay = at ? Math.max(0, at.getTime() - Date.now()) : 0;
    await this.queue.add('call', { ws, call_id: callId } satisfies OpsJob, { jobId: `op|${callId}|${at?.getTime() ?? 0}`, delay, removeOnComplete: 1000, removeOnFail: 1000 });
  }
}
