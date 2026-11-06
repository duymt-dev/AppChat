// Worker gửi của MỘT tài khoản (mở khi worker giữ phiên, đóng khi nhả — chỉ nơi có phiên mới gửi được). Chống khoá
// (Blueprint §6, REQ-B04): limiter `perMinute` của manifest / `settings.rate_per_minute`, trễ ngẫu nhiên `jitterMs` trước mỗi
// tin (giống người thật), cap/ngày cho tin chủ động (sổ theo ref, ngày UTC+7 — TIP-037); lỗi bất thường ≥ 3 lần / 10 phút → tự tạm dừng.
// Gửi bền (TIP-014b B): có sổ từng phần thì phần đã xác nhận không gửi lại; đã gọi kênh mà không rõ kết quả → `unknown` (final, không
// tự gửi lại); ghi kết quả lỗi → job chạy lại chỉ để phát lại kết quả.
import { DelayedError, UnrecoverableError } from 'bullmq';
import { Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { ChannelAuthError, ChannelOperationError, PartialSendError, type ChannelAdapter, type SendReceipt } from '@appchat/channels';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import { settingsOf } from '../services/accounts.service';
import { SEND_ATTEMPTS, emitSendResult, sendBookFor, sendQueueName, type SendBook, type SendJob, type SendResult } from '../services/send-queue';
import { UnknownPartError } from '../operations/delivery-receipts';
import { releaseCapSlot, takeCapSlot } from '../services/proactive-cap';
import { guardFor } from '../services/send-guards';
import { StaleGenerationError } from '../operations/session-generation';

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
  /** Clock (TIP-014b C) — mốc ngày của cap chủ động + cửa sổ lỗi bất thường. Vắng → giờ hệ thống. */
  now?: () => Date;
}

/** Trần cứng của limiter BullMQ (tin / phút) khi cấu hình tài khoản cao hơn manifest — cấu hình vẫn bị chặn ở `pace`. */
const RATE_CEILING = 60;
const failKey = (accountId: string) => `chfail:${accountId}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Kênh từ chối rõ ràng (đã nhận lệnh, không gửi) / phiên hết hạn → chắc chắn chưa tới khách. Còn lại sau khi gọi kênh = chưa rõ. */
const definite = (err: unknown) => err instanceof ChannelAuthError || (err instanceof ChannelOperationError && err.reason === 'rejected');
const errText = (err: unknown) => (err instanceof Error ? err.message : 'send_failed').slice(0, 200);

export class ChannelSenders {
  private readonly workers = new Map<string, Worker>();

  constructor(private readonly d: SendDeps) {}

  /**
   * `generation` (kênh lease — TIP-014b C): thế hệ phiên đang giữ; đặt chỗ phần gửi kiểm lại trong DB. Cấu hình tài khoản (tốc độ / trần
   * ngày) đọc lại MỖI job (TIP-037) — đổi ở Cài đặt có hiệu lực từ tin kế tiếp, không cần mở lại worker.
   */
  async open(accountId: string, ws: string, adapter: ChannelAdapter, generation?: number): Promise<void> {
    if (this.workers.has(accountId)) return;
    const db = await this.d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));
    const rl = adapter.manifest.rateLimit;
    const [lo, hi] = rl.jitterMs ?? [0, 0];
    const w: Worker<SendJob> = new Worker<SendJob>(
      sendQueueName(accountId),
      async (job, token) => {
        const j = job.data;
        const row = await db.channelAccount.findUnique({ where: { id: accountId }, select: { settings: true } });
        const st = row ? settingsOf(row) : null;
        await this.pace(w, accountId, Math.max(1, st?.rate_per_minute ?? rl.perMinute));
        const now = this.now();
        // Trần tin chủ động / ngày (D35): sổ theo ref — chạy lại không đếm đôi; chiến dịch hết trần → dời sang ngày kế tiếp (không lỗi).
        if (j.proactive) {
          const slot = await takeCapSlot(this.d.redis, accountId, j.ref_id, st?.daily_cap ?? rl.perDayProactive, now);
          if (!slot.ok) {
            if (j.deferrable && token) {
              await job.moveToDelayed(slot.until.getTime() + Math.floor(Math.random() * 60_000), token);
              throw new DelayedError();
            }
            await emitSendResult({ ok: false, ws: j.ws, account_id: accountId, ref_id: j.ref_id, error: 'daily_cap', final: true });
            throw new UnrecoverableError('daily_cap');
          }
        }
        const wait = (lo + Math.random() * (hi - lo)) * this.d.jitterScale;
        if (wait > 0) await sleep(wait);
        // Điểm tuyến tính hoá: domain sở hữu ref (chiến dịch — send-guards) hoặc đặt chỗ toàn cục (tin agent). Bị từ chối → không gọi kênh.
        const guard = guardFor(j.ref_id);
        const ok = guard ? await guard.reserve(j.ws, j.ref_id) : !this.d.reserve || (await this.d.reserve(j.ws, j.ref_id));
        if (!ok) {
          if (j.proactive) await releaseCapSlot(this.d.redis, accountId, j.ref_id, now);
          return null;
        }
        const book = guard ? ((await guard.book?.(j.ws, accountId, j, generation)) ?? null) : await sendBookFor(j.ws, accountId, j, generation);
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
      // Trần cứng theo manifest; tốc độ cấu hình thấp hơn áp động ở `pace`.
      { connection: this.d.redis.duplicate(), concurrency: 1, limiter: { max: Math.max(1, rl.perMinute, RATE_CEILING), duration: 60_000 } },
    );
    w.on('error', (err) => this.d.log.warn({ err, account: accountId }, 'channel send worker error'));
    this.workers.set(accountId, w);
  }

  /** Tốc độ / phút theo cấu hình hiện tại (cửa sổ phút trong Redis) — vượt → tạm hoãn cả hàng tới phút kế tiếp. */
  private async pace(w: Worker<SendJob>, accountId: string, perMinute: number): Promise<void> {
    const now = this.now().getTime();
    const k = `chrate:${accountId}:${Math.floor(now / 60_000)}`;
    const n = await this.d.redis.incr(k);
    if (n === 1) await this.d.redis.pexpire(k, 120_000);
    if (n <= perMinute) return;
    await this.d.redis.decr(k);
    await w.rateLimit(60_000 - (now % 60_000) + 50);
    throw Worker.RateLimitError();
  }

  /** Lỗi gửi: một phần đã tới / chưa rõ → final (không gửi lại); chưa tới khách → thử lại theo BullMQ. */
  private async failed(attemptsMade: number, j: SendJob, accountId: string, book: SendBook | null, err: unknown): Promise<never> {
    const cause = err instanceof PartialSendError ? err.cause : err;
    // Bị fence trước khi gọi kênh (phiên đã đổi chủ / tạm dừng): không kết quả, không đếm lỗi — job chạy lại ở chủ phiên mới.
    if (cause instanceof StaleGenerationError && !(err instanceof PartialSendError)) throw cause;
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

  private now(): Date {
    return this.d.now?.() ?? new Date();
  }

  private later(fn: () => Promise<void>): void {
    setImmediate(() => void fn().catch((err: unknown) => this.d.log.error({ err }, 'channel send follow-up failed')));
  }

  /** Ghi một lỗi gửi; true khi đủ FAIL_LIMIT lỗi trong FAIL_WINDOW_MS (rồi xoá đếm). */
  private async abnormal(accountId: string): Promise<boolean> {
    const k = failKey(accountId);
    const now = this.now().getTime();
    await this.d.redis.zadd(k, now, `${now}-${Math.random()}`);
    await this.d.redis.zremrangebyscore(k, 0, now - FAIL_WINDOW_MS);
    await this.d.redis.pexpire(k, FAIL_WINDOW_MS);
    if ((await this.d.redis.zcard(k)) < FAIL_LIMIT) return false;
    await this.d.redis.del(k);
    return true;
  }
}
