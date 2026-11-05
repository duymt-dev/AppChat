// Worker thao tác kênh của MỘT tài khoản (TIP-014b A): mở / đóng cùng vòng đời phiên (như worker gửi, tạo nhóm) — chỉ nơi giữ lease mới
// gọi nhà cung cấp. Thứ tự an toàn (như create-group): khoá lệnh queued → dispatch_reserved + attempted_at (commit) → gọi kênh → ghi kết
// quả. Job chạy lại khi lệnh đã `dispatch_reserved` → unknown, KHÔNG gọi lại. Lỗi trước khi gọi (không phiên / thiếu tham chiếu / id
// không an toàn) → failed chắc chắn; nhà cung cấp trả lỗi rõ → failed; mạng / hết giờ → unknown. Cảm xúc cũ hơn ý định hiện tại → superseded.
import { UnrecoverableError } from 'bullmq';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { ChannelNotRunningError, ChannelOperationError, type ChannelAdapter, type ProviderMessageRef, type ReactionEmoji } from '@appchat/channels';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { messageRefs } from '../operations/operation-store';
import { applyOperationResult, markInterrupted, type OperationOutcome } from '../operations/provider-event';
import { OPERATION_TIMEOUT_MS, type OperationJob } from '../operations/types';

export const operationQueueName = (accountId: string) => `chop-${accountId}`;

export interface OperationDeps {
  redis: Redis;
  kv: KeyValueStore;
  tenants: TenantDbResolver;
  log: AppLogger;
  now: () => Date;
  timeoutMs?: number;
}

/** Producer: một job mỗi lệnh (job id = id lệnh — đẩy lại không trùng). */
export class OperationQueue {
  private readonly queues = new Map<string, Queue>();
  constructor(private readonly redis: Redis) {}

  async enqueue(accountId: string, j: OperationJob): Promise<void> {
    let q = this.queues.get(accountId);
    if (!q) this.queues.set(accountId, (q = new Queue(operationQueueName(accountId), { connection: this.redis })));
    await q.add('operation', j, { jobId: `op-${j.operation_id}`, attempts: 10, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 });
  }

  async close(): Promise<void> {
    for (const q of this.queues.values()) await q.close();
    this.queues.clear();
  }
}

const toRef = (r: { threadId: string; isGroup: boolean; msgId: string; cliMsgId: string | null; senderId: string | null }): ProviderMessageRef => ({
  threadId: r.threadId,
  isGroup: r.isGroup,
  msgId: r.msgId,
  cliMsgId: r.cliMsgId,
  ...(r.senderId ? { senderId: r.senderId } : {}),
});

export class ProviderOperators {
  private readonly workers = new Map<string, Worker>();
  constructor(private readonly d: OperationDeps) {}

  async open(accountId: string, adapter: ChannelAdapter): Promise<void> {
    if (this.workers.has(accountId) || !adapter.operations) return;
    const w = new Worker<OperationJob>(operationQueueName(accountId), (job) => this.run(accountId, adapter, job.data), { connection: this.d.redis.duplicate(), concurrency: 1 });
    w.on('error', (err) => this.d.log.warn({ err, account: accountId }, 'operation worker error'));
    this.workers.set(accountId, w);
  }

  async close(accountId: string): Promise<void> {
    const w = this.workers.get(accountId);
    if (!w) return;
    this.workers.delete(accountId);
    await w.close();
  }

  async closeAll(): Promise<void> {
    for (const id of [...this.workers.keys()]) await this.close(id);
  }

  private async finish(db: TenantDb, ws: string, id: string, o: OperationOutcome | 'interrupted'): Promise<void> {
    const now = this.d.now();
    const wrote = await db.$transaction(async (tx) => {
      const events = o === 'interrupted' ? await markInterrupted(tx, id, now) : await applyOperationResult(tx, id, o, now);
      await writeOutbox(tx, ws, events, now);
      return events.length > 0;
    });
    if (wrote) await markDirty(this.d.kv, ws);
  }

  async run(accountId: string, adapter: ChannelAdapter, j: OperationJob): Promise<string> {
    const db = await this.d.tenants.get(TenantContexts.fromRoute(j.ws, 'channel'));
    const op = await db.channelOperation.findUnique({ where: { id: j.operation_id } });
    if (!op || op.channelAccountId !== accountId) return 'missing';
    if (op.status === 'dispatch_reserved') {
      await this.finish(db, j.ws, op.id, 'interrupted');
      return 'unknown';
    }
    if (op.status !== 'queued') return op.status;
    // Cảm xúc: lệnh cũ hơn ý định hiện tại của tài khoản → không gọi kênh.
    if (op.kind === 'react') {
      const cur = await db.messageAccountReaction.findUnique({ where: { messageId: op.messageId }, select: { desiredRevision: true } });
      if (cur && cur.desiredRevision > op.revision) {
        await db.channelOperation.updateMany({ where: { id: op.id, status: 'queued' }, data: { status: 'superseded', finishedAt: this.d.now() } });
        return 'superseded';
      }
    }
    // Phiên phải có trước khi đặt chỗ — chưa có thì job thử lại (an toàn: chưa gọi nhà cung cấp).
    if (!(adapter as { isRunning?: (id: string) => boolean }).isRunning?.(accountId)) throw new ChannelNotRunningError(accountId);
    const refs = (await messageRefs(db, op.messageId)).map(toRef);
    if (!refs.length) {
      await this.finish(db, j.ws, op.id, { status: 'failed', error: 'provider_ref_missing' });
      return 'failed';
    }
    const claimed = await db.channelOperation.updateMany({ where: { id: op.id, status: 'queued' }, data: { status: 'dispatch_reserved', attemptedAt: this.d.now() } });
    if (!claimed.count) return 'raced';
    const ops = adapter.operations!;
    const call = (ref: ProviderMessageRef) =>
      op.kind === 'recall' ? ops.recall!(accountId, ref) : ops.setReaction!(accountId, ref, ((op.desired as { emoji?: ReactionEmoji | null }).emoji ?? null) as ReactionEmoji | null);
    // Cảm xúc chỉ đặt trên phần cuối (tin hiển thị); thu hồi phải thu hồi mọi phần.
    const targets = op.kind === 'recall' ? refs.map((r, i) => ({ r, part: i })) : [{ r: refs.at(-1)!, part: refs.length - 1 }];
    const parts: { part_no: number; status: 'confirmed' | 'failed' | 'unknown'; error?: string }[] = [];
    for (const t of targets) {
      try {
        await Promise.race([call(t.r), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('operation_timeout')), this.d.timeoutMs ?? OPERATION_TIMEOUT_MS))]);
        parts.push({ part_no: t.part, status: 'confirmed' });
      } catch (err) {
        // Chắc chắn chưa làm: từ chối trước khi gọi / nhà cung cấp trả lỗi rõ / không phiên. Còn lại (mạng / hết giờ) → unknown.
        const sure = err instanceof ChannelOperationError || err instanceof ChannelNotRunningError;
        const msg = (err instanceof Error ? err.message : 'operation_failed').slice(0, 200);
        parts.push({ part_no: t.part, status: sure ? 'failed' : 'unknown', error: msg });
        this.d.log.warn({ account: accountId, operation: op.id, err: msg }, 'channel operation not confirmed');
      }
    }
    const outcome: OperationOutcome = targets.length > 1 ? { status: 'unknown', parts } : { status: parts[0]!.status, ...(parts[0]!.error ? { error: parts[0]!.error } : {}) };
    await this.finish(db, j.ws, op.id, outcome);
    if (parts.some((p) => p.status !== 'confirmed')) throw new UnrecoverableError(parts.find((p) => p.error)?.error ?? 'operation_failed');
    return 'confirmed';
  }
}
