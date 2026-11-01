// Consumer `notify` + `realtime` của queue `events` (outbox §4, §8) — dựng trong worker (NotifyJobsModule) với dependency thật:
// `notify` chạy luật thông báo (notify/rules.ts) → deliverIntent; `realtime` chạy luật realtime → emitter (lọc quyền ở API).
import type { AuthzResolver } from '../../authz/services/authz-resolver';
import type { EventConsumer } from '../../kernel/events/consumer';
import { deliverIntent, type NotifierDeps } from '../services/notifier';
import { notifyIntents, notifyTopics, realtimeEnvelopes, realtimeTopics } from '../rules';

export function notifyConsumer(d: NotifierDeps): EventConsumer {
  return {
    name: 'notify',
    topics: notifyTopics,
    async handle(e, db) {
      for (const [i, intent] of notifyIntents(e).entries()) await deliverIntent(d, db, e, intent, i);
    },
  };
}

export function realtimeConsumer(d: Pick<NotifierDeps, 'emitter'> & { authz: Pick<AuthzResolver, 'invalidate'> }): EventConsumer {
  return {
    name: 'realtime',
    topics: realtimeTopics,
    async handle(e) {
      for (const env of realtimeEnvelopes(e)) {
        // Đổi vai trò: bỏ cache AuthzContext trước để node API dựng lại quyền mới cho socket.
        if (env.control?.type === 'refresh_authz') await d.authz.invalidate(env.ws);
        d.emitter.publish(env);
      }
    },
  };
}
