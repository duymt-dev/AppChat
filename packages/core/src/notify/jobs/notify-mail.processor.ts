// Queue `notify-mail` (worker ROLE=jobs): gửi email thông báo theo locale người nhận (i18n §8). jobId = `mail-<notification_id>`
// → không gửi trùng khi consumer chạy lại; lỗi provider → retry back-off.
import { type Job } from 'bullmq';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { AuthzResolver } from '../../authz/services/authz-resolver';
import type { MailProvider } from '@appchat/integrations';
import type { AppLogger } from '../../kernel/logger/logger';
import { notificationMail } from '../mail';
import type { MailJob, MailQueue } from '../services/notifier';
import { currentAuthz, projectNotices } from '../services/ownership-notice';

export const NOTIFY_MAIL_QUEUE = 'notify-mail';

export class BullMailQueue implements MailQueue {
  constructor(readonly queue: Queue) {}
  async enqueue(job: MailJob): Promise<void> {
    await this.queue.add('send', job, { jobId: `mail-${job.notification_id}`, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 });
  }
}

export interface MailDeps {
  platform: Pick<PlatformDb, 'user' | 'workspace' | 'membership'>;
  mail: MailProvider;
  publicUrl: string;
  /** TIP-015d: chiếu lại thông báo chuyển phụ trách ngay trước khi gửi (quyền hiện tại của người nhận). */
  tenants?: Pick<TenantDbResolver, 'get'>;
  authz?: Pick<AuthzResolver, 'resolve'>;
}

export async function sendNotificationMail(d: MailDeps, j: MailJob): Promise<'sent' | 'skipped'> {
  const [user, ws] = await Promise.all([
    d.platform.user.findUnique({ where: { id: j.user_id }, select: { email: true, locale: true } }),
    d.platform.workspace.findUnique({ where: { id: j.workspace_id }, select: { name: true } }),
  ]);
  if (!user || !ws) return 'skipped';
  let params = j.params;
  let link = j.link;
  if (j.kind === 'crm_owner' && d.tenants && d.authz) {
    const db = await d.tenants.get(TenantContexts.system(j.workspace_id, 'notify-mail'));
    const viewer = await currentAuthz(d.platform, d.authz, j.workspace_id, j.user_id);
    const p = await projectNotices(db, d.platform, viewer, [{ id: j.notification_id, type: j.kind, title: '', link: null }], user.locale);
    if (p.has(j.notification_id)) {
      const v = p.get(j.notification_id);
      // Người nhận đã bị gỡ trước khi gửi → không gửi; mất scope → chữ chung, không tên / link khách.
      if (!v) return 'skipped';
      params = v.params;
      link = v.link;
    }
  }
  await d.mail.send(notificationMail({ to: user.email, locale: user.locale, kind: j.kind, params, workspace: ws.name, link, publicUrl: d.publicUrl }));
  return 'sent';
}

export function startMailWorker(redis: Redis, d: MailDeps, log: AppLogger): Worker {
  const w = new Worker(NOTIFY_MAIL_QUEUE, async (job: Job<MailJob>) => sendNotificationMail(d, job.data), { connection: redis.duplicate(), concurrency: 4 });
  // Không log email (PII — ops §1.4): chỉ id thông báo + loại.
  w.on('failed', (job, err) => log.warn({ err, notification_id: job?.data.notification_id, kind: job?.data.kind, attempt: job?.attemptsMade }, 'email thông báo lỗi'));
  return w;
}
