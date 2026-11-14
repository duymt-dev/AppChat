// Queue `notify-mail` (worker ROLE=jobs, TIP-006 → TIP-006b §3.1, §3.4): job chỉ mang (workspace, id ý định giao, thế hệ đánh thức) — worker
// claim ý định bền rồi kiểm thẩm quyền hiện tại, chiếu nội dung từ nguồn đã lưu, gọi provider một lần (delivery/mail.ts). Job cũ dạng payload
// thô (bản trước 006b) không có ý định khớp → không gửi. jobId theo (ý định, thế hệ) → đánh thức lại sau khi job cũ đã giữ không bị nuốt.
import { type Job } from 'bullmq';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../kernel/logger/logger';
import type { MailQueue } from '../services/notifier';
import { deliverMail, type MailDeliveryDeps } from '../delivery/mail';
import type { MailWakeup } from '../delivery/types';

export const NOTIFY_MAIL_QUEUE = 'notify-mail';

export class BullMailQueue implements MailQueue {
  constructor(readonly queue: Queue) {}
  async wake(job: MailWakeup): Promise<void> {
    await this.queue.add('send', job, { jobId: `mail-${job.delivery_id}-${job.generation}`, attempts: 1, removeOnComplete: 1000, removeOnFail: 5000 });
  }
}

export interface MailDeps extends MailDeliveryDeps {
  tenants: Pick<TenantDbResolver, 'get'>;
}

export async function sendNotificationMail(d: MailDeps, j: Partial<MailWakeup>) {
  // Job thô cũ (notification_id + email params) — không có ý định bền → không gửi.
  if (!j.ws || !j.delivery_id) return 'skipped' as const;
  return deliverMail(d, await d.tenants.get(TenantContexts.system(j.ws, 'notify-mail')), j.ws, j.delivery_id);
}

export function startMailWorker(redis: Redis, d: MailDeps, log: AppLogger): Worker {
  const w = new Worker(NOTIFY_MAIL_QUEUE, async (job: Job<MailWakeup>) => sendNotificationMail(d, job.data), { connection: redis.duplicate(), concurrency: 4 });
  // Không log email (PII — ops §1.4): chỉ id ý định.
  w.on('failed', (job, err) => log.warn({ err, delivery_id: job?.data.delivery_id }, 'email thông báo lỗi'));
  return w;
}
