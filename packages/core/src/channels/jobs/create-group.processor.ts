// Worker tạo nhóm của MỘT tài khoản (TIP-023b SPEC D): mở / đóng cùng vòng đời phiên (như worker gửi) — chỉ nơi giữ lease mới gọi Zalo.
// Thứ tự an toàn: khoá request (queued → running + attempted_at, commit) → gọi nhà cung cấp → báo kết quả qua `channel.group_result`
// (executor, nguồn system). Request đã `running` mà job chạy lại (sập sau attempt) → `unknown`, KHÔNG gọi lại. Chưa có phiên trước khi
// ghi attempt → job thử lại sau. Treo quá GROUP_TIMEOUT_MS → unknown (Zalo có thể đã tạo nhóm).
import { UnrecoverableError } from 'bullmq';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { ChannelNotRunningError, type ChannelAdapter } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { AppLogger } from '../../kernel/logger/logger';
import { GROUP_WORKER_ACTOR } from '../actions/group-result.handler';
import type { Participant } from '../services/group-requests';

export const groupQueueName = (accountId: string) => `chgroup-${accountId}`;
export const GROUP_TIMEOUT_MS = 60_000;

export interface GroupJob {
  ws: string;
  request_id: string;
}

export interface GroupDeps {
  redis: Redis;
  tenants: TenantDbResolver;
  executor: Pick<ActionExecutor, 'execute'>;
  log: AppLogger;
  timeoutMs?: number;
}

const systemCtx = (ws: string): ActionContext => ({ workspaceId: ws, source: 'system', actor: { type: 'system', id: GROUP_WORKER_ACTOR }, authz: { isOwner: true } as never });

/** Producer: một job mỗi request (job id = request id — đẩy lại không tạo trùng). */
export class GroupRequestQueue {
  private readonly queues = new Map<string, Queue>();
  constructor(private readonly redis: Redis) {}

  async enqueue(accountId: string, j: GroupJob): Promise<void> {
    let q = this.queues.get(accountId);
    if (!q) this.queues.set(accountId, (q = new Queue(groupQueueName(accountId), { connection: this.redis })));
    await q.add('create-group', j, { jobId: `group-${j.request_id}`, attempts: 10, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 });
  }

  async close(): Promise<void> {
    for (const q of this.queues.values()) await q.close();
    this.queues.clear();
  }
}

export class GroupCreators {
  private readonly workers = new Map<string, Worker>();
  constructor(private readonly d: GroupDeps) {}

  async open(accountId: string, adapter: ChannelAdapter): Promise<void> {
    if (this.workers.has(accountId) || !adapter.createGroup || !adapter.manifest.capabilities.createGroup) return;
    const w = new Worker<GroupJob>(groupQueueName(accountId), (job) => this.run(accountId, adapter, job.data), { connection: this.d.redis.duplicate(), concurrency: 1 });
    w.on('error', (err) => this.d.log.warn({ err, account: accountId }, 'group worker error'));
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

  private report(ws: string, input: Record<string, unknown>) {
    return this.d.executor.execute(systemCtx(ws), 'channel.group_result', input);
  }

  async run(accountId: string, adapter: ChannelAdapter, j: GroupJob): Promise<string> {
    const db = await this.d.tenants.get(TenantContexts.fromRoute(j.ws, 'channel'));
    const r = await db.conversationGroupRequest.findUnique({ where: { id: j.request_id } });
    if (!r || r.channelAccountId !== accountId) return 'missing';
    if (r.status === 'running') {
      // Đã thử gọi Zalo mà chưa có kết quả (sập / mất lease giữa chừng) → không tạo lại.
      await this.report(j.ws, { request_id: r.id, outcome: 'unknown', error: 'interrupted_after_attempt' });
      return 'unknown';
    }
    if (r.status !== 'queued') return r.status;
    // Phiên phải có trước khi ghi attempt — chưa có thì job thử lại (an toàn: chưa gọi nhà cung cấp).
    if (!(adapter as { isRunning?: (id: string) => boolean }).isRunning?.(accountId)) throw new ChannelNotRunningError(accountId);
    const claimed = await db.conversationGroupRequest.updateMany({ where: { id: r.id, status: 'queued' }, data: { status: 'running', attemptedAt: new Date() } });
    if (!claimed.count) return 'raced';
    const members = (r.participants as unknown as Participant[]).map((p) => p.external_id);
    try {
      const g = await Promise.race([
        adapter.createGroup!(accountId, { name: r.name, members }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('group_timeout')), this.d.timeoutMs ?? GROUP_TIMEOUT_MS)),
      ]);
      await this.report(j.ws, { request_id: r.id, outcome: 'succeeded', group_id: g.groupId, added: g.added, failed: g.failed });
      return 'succeeded';
    } catch (err) {
      // Lỗi trước khi Zalo nhận lệnh (không có phiên) → chắc chắn chưa tạo: failed. Còn lại (timeout / lỗi giữa chừng) → unknown.
      const sure = err instanceof ChannelNotRunningError;
      const msg = (err instanceof Error ? err.message : 'group_failed').slice(0, 200);
      await this.report(j.ws, { request_id: r.id, outcome: sure ? 'failed' : 'unknown', error: msg });
      this.d.log.warn({ account: accountId, request: r.id, err: msg }, 'create group outcome not confirmed');
      throw new UnrecoverableError(msg);
    }
  }
}
