// Worker gửi của MỘT tài khoản (mở khi worker giữ phiên, đóng khi nhả — chỉ nơi có phiên mới gửi được). Chống khoá
// (Blueprint §6, REQ-B04): limiter `perMinute` của manifest / `settings.rate_per_minute`, trễ ngẫu nhiên `jitterMs` trước mỗi
// tin (giống người thật), cap/ngày cho tin chủ động; lỗi bất thường ≥ 3 lần / 10 phút → tự tạm dừng + báo Owner.
import { UnrecoverableError, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { ChannelAuthError, type ChannelAdapter } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import { settingsOf } from '../services/accounts.service';
import { SEND_ATTEMPTS, emitSendResult, sendQueueName, type SendJob } from '../services/send-queue';

export const FAIL_WINDOW_MS = 10 * 60_000;
export const FAIL_LIMIT = 3;

export interface SendDeps {
  redis: Redis;
  tenants: TenantDbResolver;
  log: AppLogger;
  /** Hệ số trễ ngẫu nhiên (1 = theo manifest; 0 = tắt — chỉ test / e2e, cấm production). */
  jitterScale: number;
  /** Lỗi bất thường liên tiếp → tự tạm dừng tài khoản (ChannelSessions.markDown 'send_errors'). */
  pause: (ws: string, accountId: string, detail: string) => Promise<void>;
  expire: (ws: string, accountId: string) => Promise<void>;
}

const dayKey = (accountId: string, now: Date) => `chcap:${accountId}:${now.toISOString().slice(0, 10)}`;
const failKey = (accountId: string) => `chfail:${accountId}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class ChannelSenders {
  private readonly workers = new Map<string, Worker>();

  constructor(private readonly d: SendDeps) {}

  async open(accountId: string, ws: string, adapter: ChannelAdapter): Promise<void> {
    if (this.workers.has(accountId)) return;
    const db = await this.d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));
    const row = await db.channelAccount.findUnique({ where: { id: accountId }, select: { settings: true } });
    const st = row ? settingsOf(row) : null;
    const rl = adapter.manifest.rateLimit;
    const perMinute = Math.max(1, st?.rate_per_minute ?? rl.perMinute);
    const cap = st?.daily_cap ?? rl.perDayProactive;
    const [lo, hi] = rl.jitterMs ?? [0, 0];
    const w = new Worker<SendJob>(
      sendQueueName(accountId),
      async (job) => {
        const j = job.data;
        if (j.proactive && cap !== undefined) {
          const k = dayKey(accountId, new Date());
          const n = await this.d.redis.incr(k);
          if (n === 1) await this.d.redis.pexpire(k, 26 * 3_600_000);
          if (n > cap) {
            await this.d.redis.decr(k);
            await emitSendResult({ ok: false, ws: j.ws, account_id: accountId, ref_id: j.ref_id, error: 'daily_cap', final: true });
            throw new UnrecoverableError('daily_cap');
          }
        }
        const wait = (lo + Math.random() * (hi - lo)) * this.d.jitterScale;
        if (wait > 0) await sleep(wait);
        try {
          const { externalMsgId } = await adapter.send(accountId, j.message);
          await this.d.redis.del(failKey(accountId));
          await emitSendResult({ ok: true, ws: j.ws, account_id: accountId, ref_id: j.ref_id, external_msg_id: externalMsgId });
          return externalMsgId;
        } catch (err) {
          const final = err instanceof ChannelAuthError || job.attemptsMade + 1 >= SEND_ATTEMPTS;
          const msg = (err instanceof Error ? err.message : 'send_failed').slice(0, 200);
          await emitSendResult({ ok: false, ws: j.ws, account_id: accountId, ref_id: j.ref_id, error: msg, final });
          // Tạm dừng / hết hạn đóng chính worker này (Worker.close chờ job đang chạy) → chạy SAU khi job kết thúc.
          if (err instanceof ChannelAuthError) {
            this.later(() => this.d.expire(j.ws, accountId));
            throw new UnrecoverableError('channel_auth');
          }
          if (await this.abnormal(accountId)) this.later(() => this.d.pause(j.ws, accountId, msg));
          throw err;
        }
      },
      { connection: this.d.redis.duplicate(), concurrency: 1, limiter: { max: perMinute, duration: 60_000 } },
    );
    w.on('error', (err) => this.d.log.warn({ err, account: accountId }, 'channel send worker error'));
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

  private later(fn: () => Promise<void>): void {
    setImmediate(() => void fn().catch((err: unknown) => this.d.log.error({ err }, 'channel send follow-up failed')));
  }

  /** Ghi một lỗi gửi; true khi đủ FAIL_LIMIT lỗi trong FAIL_WINDOW_MS (rồi xoá đếm). */
  private async abnormal(accountId: string): Promise<boolean> {
    const k = failKey(accountId);
    const now = Date.now();
    await this.d.redis.zadd(k, now, `${now}-${Math.random()}`);
    await this.d.redis.zremrangebyscore(k, 0, now - FAIL_WINDOW_MS);
    await this.d.redis.pexpire(k, FAIL_WINDOW_MS);
    if ((await this.d.redis.zcard(k)) < FAIL_LIMIT) return false;
    await this.d.redis.del(k);
    return true;
  }
}
