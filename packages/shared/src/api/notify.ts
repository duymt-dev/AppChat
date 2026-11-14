// Shape đọc domain notify (FE ↔ BE — gap-filling §5): `GET /v1/notifications`, `GET /v1/settings/notifications`.
// Mock transport (apps/web) và API thật parse cùng các schema này.
import { z } from 'zod';
import { NOTIFY_GROUPS, NOTIFY_KIND_KEYS } from '../notify/catalog';

export const notificationItemSchema = z.object({
  id: z.string(),
  icon: z.string(),
  tone: z.enum(['warn', 'danger', 'info', 'teal']),
  title: z.string(),
  /** Thời gian tương đối theo locale người xem ("2 phút trước"). */
  ago: z.string(),
  /** Mở rộng tương thích ngược (mock chưa có): */
  kind: z.string().optional(),
  link: z.string().nullable().optional(),
  read: z.boolean().optional(),
  created_at: z.string().optional(),
});
export type NotificationItemDto = z.infer<typeof notificationItemSchema>;

export const notificationListSchema = z.object({ data: z.array(notificationItemSchema), next_cursor: z.string().nullable() });

const channels = z.object({ desktop: z.boolean(), email: z.boolean(), mobile: z.boolean() });
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const notifyPrefsSchema = z.object({
  groups: z.array(
    z.object({ key: z.enum(NOTIFY_GROUPS), events: z.array(channels.extend({ key: z.enum(NOTIFY_KIND_KEYS as [string, ...string[]]) })) }),
  ),
  dnd: z.object({ on: z.boolean(), from: HHMM, to: HHMM }),
  sound: z.boolean(),
  digest: z.enum(['off', 'daily', 'weekly']),
});
export type NotifyPrefsDto = z.infer<typeof notifyPrefsSchema>;
