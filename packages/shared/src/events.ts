// Domain event dùng chung (standards/events/outbox.md §3): tên `<entity>.<past_tense>` + zod payload. Payload luôn có `ws`
// + `occurred_at` (writeOutbox thêm). TIP domain thêm event của mình vào đây khi phát (và bảng Blueprint §2.3).
import { z } from 'zod';
import { PERMISSIONS } from './authz/permissions';
import { NOTIFY_KIND_KEYS, type NotifyKind } from './notify/catalog';

const base = { ws: z.string().uuid(), occurred_at: z.string() };

/** Xin gửi thông báo (TIP-006): handler bất kỳ phát event này thay vì tự ghi `notification` / gửi email. */
export const notifyRequestedEvent = z.object({
  ...base,
  kind: z.enum(NOTIFY_KIND_KEYS as [NotifyKind, ...NotifyKind[]]),
  /** Người nhận: danh sách user và / hoặc mọi thành viên có permission (Owner luôn có). Ít nhất một. */
  to: z.object({ user_ids: z.array(z.string().uuid()).max(500).optional(), permission: z.enum(PERMISSIONS).optional() }).refine((t) => t.user_ids?.length || t.permission, 'to rỗng'),
  /** Tham số chữ `{x}` của mẫu i18n/server. */
  params: z.record(z.string(), z.union([z.string().max(200), z.number()])).default({}),
  /** Đường dẫn trong app, vd. `/inbox?c=…` (email ghép APP_PUBLIC_URL). */
  link: z.string().startsWith('/').max(500).optional(),
  /** Không gửi người gây ra sự kiện. */
  exclude_user_id: z.string().uuid().optional(),
});
export type NotifyRequestedEvent = z.infer<typeof notifyRequestedEvent>;

/** Đổi vai trò / uỷ quyền (TIP-013 phát) — xoá cache AuthzContext, WS `authz.changed`. */
export const memberRoleChangedEvent = z.object({ ...base, user_id: z.string().uuid(), role_key: z.string().optional() });
/** Gỡ thành viên (TIP-013 phát) — ngắt socket của người đó. */
export const memberRemovedEvent = z.object({ ...base, user_id: z.string().uuid() });

export const EVENT_SCHEMAS = {
  'notify.requested': notifyRequestedEvent,
  'member.role_changed': memberRoleChangedEvent,
  'member.removed': memberRemovedEvent,
} as const;
export type EventTopic = keyof typeof EVENT_SCHEMAS;
