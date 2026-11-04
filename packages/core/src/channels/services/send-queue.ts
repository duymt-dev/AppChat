// Gửi tin qua kênh (omnichannel-adapter §6, Blueprint §1.3 queue `send:<channel_account_id>`): luôn qua hàng đợi của tài khoản,
// không gửi đồng bộ trong request. Tên queue `chsend-<id>` (BullMQ cấm `:`). Producer cho Inbox / chiến dịch (TIP-016 / 037);
// kết quả trả về qua SendResultSink do domain gọi đăng ký (ghi `message.status`, `external_msg_id`).
import { Queue } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { OutboundMessage } from '@appchat/channels';

export const sendQueueName = (accountId: string) => `chsend-${accountId}`;

export interface SendJob {
  ws: string;
  account_id: string;
  /** Id bản ghi phía gọi (vd. `message.id` / `outbox_message.id`) — job id chống gửi trùng. */
  ref_id: string;
  message: OutboundMessage;
  /** Tin chủ động (chiến dịch / follow-up): tính vào cap/ngày `manifest.rateLimit.perDayProactive` / `settings.daily_cap`. */
  proactive?: boolean;
}

export type SendResult =
  | { ok: true; ws: string; account_id: string; ref_id: string; external_msg_id: string }
  | { ok: false; ws: string; account_id: string; ref_id: string; error: string; final: boolean };

export type SendResultSink = (r: SendResult) => Promise<void>;

const SINKS = new Map<string, SendResultSink>();
/** Domain đăng ký nhận kết quả gửi (TIP-016 `inbox`, TIP-037 `campaign`). */
export const registerSendResultSink = (name: string, s: SendResultSink) => void SINKS.set(name, s);
export const unregisterSendResultSink = (name: string) => void SINKS.delete(name);
export async function emitSendResult(r: SendResult): Promise<void> {
  for (const s of SINKS.values()) await s(r).catch(() => undefined);
}

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
