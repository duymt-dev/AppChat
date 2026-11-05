// Worker gửi của MỘT tài khoản (mở khi worker giữ phiên, đóng khi nhả — chỉ nơi có phiên mới gửi được). Chống khoá
// (Blueprint §6, REQ-B04): limiter `perMinute` của manifest / `settings.rate_per_minute`, trễ ngẫu nhiên `jitterMs` trước mỗi
// tin (giống người thật), cap/ngày cho tin chủ động; lỗi bất thường ≥ 3 lần / 10 phút → tự tạm dừng + báo Owner.
// Gửi bền (TIP-014b B): có sổ từng phần thì phần đã xác nhận không gửi lại; đã gọi kênh mà không rõ kết quả → `unknown` (final, không
// tự gửi lại); ghi kết quả lỗi → job chạy lại chỉ để phát lại kết quả.
import { UnrecoverableError } from 'bullmq';
import { Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { ChannelAuthError, ChannelOperationError, PartialSendError, type ChannelAdapter, type SendReceipt } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import { settingsOf } from '../services/accounts.service';
import { SEND_ATTEMPTS, emitSendResult, sendBookFor, sendQueueName, type SendBook, type SendJob, type SendResult } from '../services/send-queue';
import { UnknownPartError } from '../operations/delivery-receipts';

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
  /**
   * Đặt chỗ gửi trước khi gọi kênh (TIP-045b annex D — tin agent: fence lượt + epoch dưới khoá hội thoại). `false` = bị từ chối (người
   * đã tiếp quản) → không gọi kênh. Vắng → gửi như cũ.
   */
  reserve?: (ws: string, refId: string) => Promise<boolean>;
}

const dayKey = (accountId: string, now: Date) => `chcap:${accountId}:${now.toISOString().slice(0, 10)}`;
const failKey = (accountId: string) => `chfail:${accountId}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Kênh từ chối rõ ràng (đã nhận lệnh, không gửi) / phiên hết hạn → chắc chắn chưa tới khách. Còn lại sau khi gọi kênh = chưa rõ. */
const definite = (err: unknown) => err instanceof ChannelAuthError || (err instanceof ChannelOperationError && err.reason === 'rejected');
const errText = (err: unknown) => (err instanceof Error ? err.message : 'send_failed').slice(0, 200);

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
        // Điểm tuyến tính hoá với người tiếp quản: đặt chỗ commit → gửi đúng một lần; bị từ chối → dừng hẳn (không thử lại).
        if (this.d.reserve && !(await this.d.reserve(j.ws, j.ref_id))) return null;
        const book = await sendBookFor(j.ws, accountId, j);
        let sent: SendReceipt;
        try {
          sent = await adapter.send(accountId, j.message, book?.ledger);
        } catch (err) {
          return this.failed(job.attemptsMade, j, accountId, book, err);
        }
        await this.d.redis.del(failKey(accountId));
        // Có sổ: ghi kết quả lỗi → ném để BullMQ chạy lại (sổ bỏ qua phần đã gửi → chỉ phát lại kết quả).
        await emitSendResult({ ok: true, ws: j.ws, account_id: accountId, ref_id: j.ref_id, external_msg_id: sent.externalMsgId, ...(sent.parts ? { parts: sent.parts } : {}) }, !!book);
        return sent.externalMsgId;
      },
      { connection: this.d.redis.duplicate(), concurrency: 1, limiter: { max: perMinute, duration: 60_000 } },
    );
    w.on('error', (err) => this.d.log.warn({ err, account: accountId }, 'channel send worker error'));
    this.workers.set(accountId, w);
  }

  /** Lỗi gửi: một phần đã tới / chưa rõ → final (không gửi lại); chưa tới khách → thử lại theo BullMQ. */
  private async failed(attemptsMade: number, j: SendJob, accountId: string, book: SendBook | null, err: unknown): Promise<never> {
    const cause = err instanceof PartialSendError ? err.cause : err;
    const sure = definite(cause);
    const touched = book && !(cause instanceof UnknownPartError) ? await book.fail(sure, errText(cause)) : 0;
    const emit = (r: Omit<Extract<SendResult, { ok: false }>, 'ok' | 'ws' | 'account_id' | 'ref_id'>) => emitSendResult({ ok: false, ws: j.ws, account_id: accountId, ref_id: j.ref_id, ...r }, !!book);
    if (cause instanceof ChannelAuthError) this.later(() => this.d.expire(j.ws, accountId));
    // Đã gửi được một phần (TIP-014b): ghi phần đã có, KHÔNG thử lại (thử lại sẽ gửi trùng các phần đã tới khách).
    if (err instanceof PartialSendError) {
      await emit({ error: `partial:${errText(cause)}`, final: true, outcome: 'partial', ...(err.receipt.parts ? { parts: err.receipt.parts } : {}) });
      throw new UnrecoverableError('channel_partial_send');
    }
    // Phần treo từ lần chạy trước / đã gọi kênh mà lỗi không rõ → không biết đã tới khách chưa.
    if (cause instanceof UnknownPartError || (touched > 0 && !sure)) {
      await emit({ error: `unknown:${errText(cause)}`, final: true, outcome: 'unknown' });
      // Phần treo từ lần chạy trước không phải lỗi mới của kênh → không tính vào tự tạm dừng.
      if (!(cause instanceof UnknownPartError) && (await this.abnormal(accountId))) this.later(() => this.d.pause(j.ws, accountId, errText(cause)));
      throw new UnrecoverableError('channel_send_unknown');
    }
    const final = err instanceof ChannelAuthError || attemptsMade + 1 >= SEND_ATTEMPTS;
    const msg = errText(err);
    await emit({ error: msg, final });
    // Tạm dừng / hết hạn đóng chính worker này (Worker.close chờ job đang chạy) → chạy SAU khi job kết thúc.
    if (err instanceof ChannelAuthError) throw new UnrecoverableError('channel_auth');
    if (await this.abnormal(accountId)) this.later(() => this.d.pause(j.ws, accountId, msg));
    throw err;
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
