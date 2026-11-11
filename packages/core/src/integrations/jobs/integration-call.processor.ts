// Queue `integrations` (provider-ports §5, Blueprint §1.3): mọi lệnh gọi ra ngoài chạy bất đồng bộ — retry back-off, idempotency
// `(connection_id, op, ref_id)`, ghi `integration_call_log` (op, ref, trạng thái, độ trễ, lỗi — KHÔNG secret / payload).
// Domain đăng ký handler theo `op` (`registerIntegrationOp`); hết lượt thử → `failed` + outbox `integration.error`.
import { type Job } from 'bullmq';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { ConnectionCtx, ConnectorAdapter, ConnectorRegistry } from '@appchat/integrations';
import { uuidv7 } from '../../kernel/ids';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { connectionCtx } from '../services/connections.service';
import { adapterOf } from '../services/adapter-selection';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export const INTEGRATIONS_QUEUE = 'integrations';
export const CALL_ATTEMPTS = 5;

export interface IntegrationCallJob {
  workspace_id: string;
  connection_id: string;
  op: string;
  ref_type?: string;
  ref_id: string;
  payload?: unknown;
}

export type IntegrationOpHandler = (a: { conn: ConnectionCtx; adapter: ConnectorAdapter | null; payload: unknown; workspaceId: string }) => Promise<void>;

const OPS = new Map<string, IntegrationOpHandler>();
/** Domain (TIP-010 bank feed, 031 đồng bộ đơn, einvoice…) đăng ký thao tác gọi ra ngoài của mình khi nạp module. */
export const registerIntegrationOp = (op: string, h: IntegrationOpHandler) => void OPS.set(op, h);
export const unregisterIntegrationOp = (op: string) => void OPS.delete(op);

export const callKey = (j: Pick<IntegrationCallJob, 'connection_id' | 'op' | 'ref_id'>) => `${j.connection_id}:${j.op}:${j.ref_id}`;
// BullMQ không nhận ':' trong jobId tuỳ biến.
const jobId = (j: IntegrationCallJob) => `call|${callKey(j).replaceAll(':', '|')}`;

export class IntegrationCalls {
  constructor(private readonly queue: Queue) {}
  /** Cùng (connection, op, ref) enqueue nhiều lần → một job (jobId cố định) + một dòng call log. */
  async enqueue(j: IntegrationCallJob): Promise<void> {
    await this.queue.add(j.op, j, {
      jobId: jobId(j),
      attempts: CALL_ATTEMPTS,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}

export interface CallDeps {
  tenants: TenantDbResolver;
  registry: ConnectorRegistry;
  key: Buffer;
  kv: KeyValueStore;
  now: () => Date;
}

/** Một lần chạy job (worker gọi; test gọi trực tiếp). `final` = lượt thử cuối. */
export async function runIntegrationCall(d: CallDeps, j: IntegrationCallJob, attempt: number, final: boolean): Promise<'succeeded' | 'skipped'> {
  const db = await d.tenants.get(TenantContexts.system(j.workspace_id, `integrations:${j.op}`));
  const idem = callKey(j);
  const log = await db.integrationCallLog.upsert({
    where: { idempotencyKey: idem },
    create: { id: uuidv7(d.now().getTime()), connectionId: j.connection_id, op: j.op, refType: j.ref_type ?? null, refId: j.ref_id, idempotencyKey: idem, status: 'running', attempts: attempt },
    update: { attempts: attempt },
  });
  // Đã thành công ở lần trước (job bị enqueue lại sau khi dọn) → không gọi ra ngoài lần hai.
  if (log.status === 'succeeded') return 'skipped';
  const started = Date.now();
  try {
    const row = await db.integrationConnection.findUnique({ where: { id: j.connection_id } });
    if (!row || row.status === 'disconnected') throw new Error('connection không còn kết nối');
    const h = OPS.get(j.op);
    if (!h) throw new Error(`op chưa đăng ký: ${j.op}`);
    await h({ conn: connectionCtx(row, d.key), adapter: adapterOf(d.registry, row.connectorKey, row.mode), payload: j.payload, workspaceId: j.workspace_id });
    await db.integrationCallLog.update({ where: { id: log.id }, data: { status: 'succeeded', latencyMs: Date.now() - started, error: null } });
    await db.integrationConnection.update({ where: { id: j.connection_id }, data: { lastSyncAt: d.now(), lastError: null } });
    return 'succeeded';
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await inEventTransaction(db, j.workspace_id, async (tx) => {
      await tx.integrationCallLog.update({ where: { id: log.id }, data: { status: final ? 'failed' : 'running', latencyMs: Date.now() - started, error: msg } });
      if (!final) return;
      const conn = await tx.integrationConnection.findUnique({ where: { id: j.connection_id }, select: { connectorKey: true, status: true } });
      if (conn && conn.status !== 'disconnected') await tx.integrationConnection.update({ where: { id: j.connection_id }, data: { status: 'error', lastError: msg } });
      await writeOutbox(tx, j.workspace_id, [{ topic: 'integration.error', payload: { connection_id: j.connection_id, connector_key: conn?.connectorKey ?? '', op: j.op, error: msg } }], d.now());
    });
    if (final) await markDirty(d.kv, j.workspace_id);
    throw e;
  }
}

export function startIntegrationsWorker(redis: Redis, d: CallDeps, log: AppLogger): Worker {
  const w = new Worker(
    INTEGRATIONS_QUEUE,
    async (job: Job<IntegrationCallJob>) => {
      const attempt = job.attemptsMade + 1;
      return runIntegrationCall(d, job.data, attempt, attempt >= (job.opts.attempts ?? 1));
    },
    { connection: redis.duplicate(), concurrency: 8 },
  );
  // Không log payload (có thể nhạy cảm — provider-ports §5): chỉ op + connection + lượt.
  w.on('failed', (job, err) => log.warn({ err: err.message, op: job?.data.op, connection_id: job?.data.connection_id, attempt: job?.attemptsMade }, 'gọi integration lỗi'));
  return w;
}
