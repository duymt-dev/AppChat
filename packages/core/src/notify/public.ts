// API công khai của domain notify cho apps/api (controller + gateway), domain khác (luật thông báo / realtime) và test.
// Một dòng re-export ở src/index.ts (facade).
export { registerNotificationRule, registerRealtimeRule, notifyIntents, realtimeEnvelopes, type NotifyIntent } from './rules';
export { NotifyPrefsService } from './services/prefs.service';
export { listNotifications, toNotificationDto, NOTIFICATIONS_PAGE, NOTIFICATIONS_PAGE_MAX } from './services/notifications.service';
export { deliverIntent, deterministicId, type MailJob, type MailQueue, type NotifierDeps } from './services/notifier';
export { resolveRecipients, type Recipient } from './services/recipients';
export { notificationMail, notificationTitle } from './mail';
export { notifyConsumer, realtimeConsumer } from './events/notify.consumers';
export { BullMailQueue, NOTIFY_MAIL_QUEUE, sendNotificationMail } from './jobs/notify-mail.processor';
export { RT_EVENT, WS_NAMESPACE, rooms, type RealtimeEnvelope, type RealtimeRequire } from './realtime/envelope';
export { REALTIME_EMITTER, RedisRealtimeEmitter, MemoryRealtimeEmitter, type RealtimeEmitter } from './realtime/emitter';
export { allowedFor, filterRecipients, registerGrantLookup, type GrantLookup, type SocketIdentity } from './realtime/filter';
export { registerConversationGuard, conversationGuard, type ConversationGuard } from './realtime/conv-guard';
