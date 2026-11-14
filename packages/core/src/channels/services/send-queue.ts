// Gửi tin qua kênh (omnichannel-adapter §6, Blueprint §1.3 queue `send:<channel_account_id>`): luôn qua hàng đợi của tài khoản,
// không gửi đồng bộ trong request. Tên queue `chsend-<id>` (BullMQ cấm `:`). Producer cho Inbox / chiến dịch (TIP-016 / 037);
// kết quả trả về qua SendResultSink do domain gọi đăng ký (ghi `message.status`, `external_msg_id`).
import { Queue } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { OutboundMessage, ProviderMessageRef, SendLedger } from '@appchat/channels';
import { guardFor } from './send-guards';

export const sendQueueName = (accountId: string) => `chsend-${accountId}`;

export interface SendJob {
  ws: string;
  account_id: string;
  /** Id bản ghi phía gọi (vd. `message.id` / `outbox_message.id`) — job id chống gửi trùng. */
  ref_id: string;
  message: OutboundMessage;
  /** Tin chủ động (chiến dịch / follow-up): tính vào cap/ngày `manifest.rateLimit.perDayProactive` / `settings.daily_cap`. */
  proactive?: boolean;
  /** Hết trần ngày → dời sang ngày kế tiếp thay vì lỗi (chiến dịch — TIP-037). */
  deferrable?: boolean;
}

/**
 * `parts` (TIP-014b): tham chiếu từng phần đã gửi theo thứ tự — inbox lưu `message_provider_ref` để thu hồi / cảm xúc. `partial` = đã
 * gửi được `parts` rồi phần sau lỗi: KHÔNG gửi lại cả tin (final), inbox ghi phần đã có + báo lỗi.
 */
export type SendResult =
  | { ok: true; ws: string; account_id: string; ref_id: string; external_msg_id: string; parts?: ProviderMessageRef[] }
  | { ok: false; ws: string; account_id: string; ref_id: string; error: string; final: boolean; parts?: ProviderMessageRef[]; outcome?: SendOutcome; deferred_until?: string };

/**
 * Kết quả lỗi trung thực (TIP-014b B): `partial` = một số phần đã tới khách; `unknown` = đã gọi kênh mà không biết kết quả (mất kết
 * nối / sập giữa chừng) — cả hai là final, KHÔNG tự gửi lại; vắng = lỗi thường (chưa tới khách).
 */
export type SendOutcome = 'partial' | 'unknown';

export type SendResultSink = (r: SendResult) => Promise<void>;

const SINKS = new Map<string, SendResultSink>();
/** Domain đăng ký nhận kết quả gửi (TIP-016 `inbox`, TIP-037 `campaign`). */
export const registerSendResultSink = (name: string, s: SendResultSink) => void SINKS.set(name, s);
export const unregisterSendResultSink = (name: string) => void SINKS.delete(name);
/**
 * `strict` (gửi có sổ từng phần — TIP-014b B): lỗi ghi kết quả ném ra → BullMQ chạy lại job; sổ bỏ qua phần đã xác nhận nên lần sau chỉ
 * phát lại kết quả, không gửi trùng. Không có sổ → nuốt lỗi như cũ (chạy lại sẽ gửi lại cả tin).
 */
export async function emitSendResult(r: SendResult, strict = false): Promise<void> {
  // Ref của domain có chốt chặn riêng (chiến dịch — TIP-037): chỉ domain đó nhận kết quả.
  const g = guardFor(r.ref_id);
  if (g) return strict ? g.result(r) : g.result(r).catch(() => undefined);
  for (const s of SINKS.values()) {
    if (strict) await s(r);
    else await s(r).catch(() => undefined);
  }
}

/** Đặt chỗ gửi (TIP-045b annex D): domain gửi tin agent đăng ký (`inbox`) — false = bị từ chối, không gọi kênh. */
export type SendReserver = (ws: string, refId: string) => Promise<boolean>;
let RESERVER: SendReserver | null = null;
export const registerSendReserver = (r: SendReserver | null) => void (RESERVER = r);
/** Chưa có domain đăng ký → gửi như cũ. Lỗi đặt chỗ ném ra để BullMQ thử lại (không gửi khi chưa chắc). */
export const reserveSend: SendReserver = (ws, refId) => (RESERVER ? RESERVER(ws, refId) : Promise.resolve(true));

/**
 * Sổ gửi từng phần (TIP-014b B): domain sở hữu bản ghi gửi (`inbox` — outbox_message) cấp sổ cho job; `fail` ghi phần đang đặt chỗ là
 * lỗi chắc chắn / chưa rõ và trả số phần bị ảnh hưởng (> 0 = đã gọi kênh). null = không có bản ghi (job thử nghiệm) → gửi như cũ.
 */
export interface SendBook {
  ledger: SendLedger;
  fail(definite: boolean, error: string): Promise<number>;
}
export type SendBooks = (ws: string, accountId: string, job: SendJob, generation?: number) => Promise<SendBook | null>;
let BOOKS: SendBooks | null = null;
export const registerSendBooks = (b: SendBooks | null) => void (BOOKS = b);
export const sendBookFor: SendBooks = (ws, accountId, job, generation) => (BOOKS ? BOOKS(ws, accountId, job, generation) : Promise.resolve(null));

export const SEND_ATTEMPTS = 5;

export class ChannelSendQueue {
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly redis: Redis) {}

  /** Cùng `ref_id` enqueue nhiều lần → một job (gửi một lần). */
  async enqueue(j: SendJob): Promise<void> {
    await this.queue(j.account_id).add('send', j, {
      jobId: `send-${j.ref_id}`.replaceAll(':', '_'),
      attempts: SEND_ATTEMPTS,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  private queue(accountId: string): Queue {
    let q = this.queues.get(accountId);
    if (!q) {
      q = new Queue(sendQueueName(accountId), { connection: this.redis });
      this.queues.set(accountId, q);
    }
    return q;
  }

  async close(): Promise<void> {
    for (const q of this.queues.values()) await q.close();
    this.queues.clear();
  }
}
