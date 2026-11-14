// Luật event → thông báo / realtime (Blueprint §2.3 cột consumer `notify`, outbox §8). Domain đăng ký ở top-level file
// `events/*.rules.ts` của mình (như tenant seed); consumer `notify` / `realtime` (notify/events) chạy theo registry này.
import type { NotifyKind, PermissionKey } from '@appchat/shared';
import type { DomainEvent } from '../kernel/events/consumer';
import type { RealtimeEnvelope } from './realtime/envelope';
import { stripRealtimeFields } from '../authz/fields/realtime';

export interface NotifyIntent {
  kind: NotifyKind;
  /** `ownerOnly` = Owner HIỆN TẠI của workspace, đọc lúc gửi (TIP-019b §4.5) — không lưu id chủ cũ trong event. */
  to: { userIds?: readonly string[]; permission?: PermissionKey; ownerOnly?: boolean };
  params: Record<string, string | number>;
  link?: string;
  excludeUserId?: string;
  /** Gửi đúng một lần theo khoá nghiệp vụ (vd. `approval_expiry:<id>`) dù event phát lại / người nhận đổi (notifier giữ biên nhận). */
  onceKey?: string;
  /** TIP-015d: thông báo chuyển phụ trách — dòng gốc tiêu đề chung + link null, ràng `contact_transfer_notice`, chiếu lúc đọc. */
  ownershipNotice?: { transferId: string; direction: 'from' | 'to' };
}

type NotifyBuild = (e: DomainEvent) => NotifyIntent[];
type RealtimeBuild = (e: DomainEvent) => RealtimeEnvelope[];

interface Rule<B> {
  name: string;
  topic: string;
  build: B;
}

const notifyRules = new Map<string, Rule<NotifyBuild>>();
const realtimeRules = new Map<string, Rule<RealtimeBuild>>();

const put = <B>(m: Map<string, Rule<B>>, r: Rule<B>) => {
  if (m.has(r.name) && m.get(r.name)!.build !== r.build) throw new Error(`Trùng luật: ${r.name}`);
  m.set(r.name, r);
};

/** `name` duy nhất (vd. `support.sla_warn`); một topic có thể có nhiều luật. */
export const registerNotificationRule = (name: string, topic: string, build: NotifyBuild) => put(notifyRules, { name, topic, build });
export const registerRealtimeRule = (name: string, topic: string, build: RealtimeBuild) => put(realtimeRules, { name, topic, build });

export const notifyTopics = () => [...new Set([...notifyRules.values()].map((r) => r.topic))];
export const realtimeTopics = () => [...new Set([...realtimeRules.values()].map((r) => r.topic))];

export const notifyIntents = (e: DomainEvent): NotifyIntent[] => [...notifyRules.values()].filter((r) => r.topic === e.topic).flatMap((r) => r.build(e));
/** Gói tin không mang giá trị trường tuỳ biến / trường có ràng buộc quyền (TIP-045b annex C) — FE tải lại qua REST đã chiếu. */
export const realtimeEnvelopes = (e: DomainEvent): RealtimeEnvelope[] =>
  [...realtimeRules.values()].filter((r) => r.topic === e.topic).flatMap((r) => r.build(e)).map((env) => ({ ...env, data: stripRealtimeFields(env.data) }));
