// Queue `notify-mail` (worker ROLE=jobs): gửi email thông báo theo locale người nhận (i18n §8). jobId = `mail-<notification_id>`
// → không gửi trùng khi consumer chạy lại; lỗi provider → retry back-off.
import { type Job } from 'bullmq';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { PlatformDb } from '@appchat/db';
import type { MailProvider } from '@appchat/integrations';
import type { AppLogger } from '../../kernel/logger/logger';
import { notificationMail } from '../mail';
import type { MailJob, MailQueue } from '../services/notifier';

export const NOTIFY_MAIL_QUEUE = 'notify-mail';

export class BullMailQueue implements MailQueue {
  constructor(readonly queue: Queue) {}
  async enqueue(job: MailJob): Promise<void> {
    await this.queue.add('send', job, { jobId: `mail-${job.notification_id}`, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 });
  }
}

export async function sendNotificationMail(d: { platform: Pick<PlatformDb, 'user' | 'workspace'>; mail: MailProvider; publicUrl: string }, j: MailJob): Promise<'sent' | 'skipped'> {
  const [user, ws] = await Promise.all([
    d.platform.user.findUnique({ where: { id: j.user_id }, select: { email: true, locale: true } }),
    d.platform.workspace.findUnique({ where: { id: j.workspace_id }, select: { name: true } }),
  ]);
  if (!user || !ws) return 'skipped';
  await d.mail.send(notificationMail({ to: user.email, locale: user.locale, kind: j.kind, params: j.params, workspace: ws.name, link: j.link, publicUrl: d.publicUrl }));
  return 'sent';
}

export function startMailWorker(redis: Redis, d: Parameters<typeof sendNotificationMail>[0], log: AppLogger): Worker {
  const w = new Worker(NOTIFY_MAIL_QUEUE, async (job: Job<MailJob>) => sendNotificationMail(d, job.data), { connection: redis.duplicate(), concurrency: 4 });
  // Không log email (PII — ops §1.4): chỉ id thông báo + loại.
  w.on('failed', (job, err) => log.warn({ err, notification_id: job?.data.notification_id, kind: job?.data.kind, attempt: job?.attemptsMade }, 'email thông báo lỗi'));
  return w;
}
