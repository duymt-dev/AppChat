// Sự kiện domain insights (TIP-038 pha 2, standards/events/outbox.md): việc follow khách xong / hoàn tác — làm mới dashboard + lịch.
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string() };
const followUpEvent = z.object({ ...base, follow_up_id: z.string().uuid(), contact_id: z.string().uuid(), version: z.number().int() });

export const INSIGHTS_EVENT_SCHEMAS = {
  'follow_up.completed': followUpEvent,
  'follow_up.undone': followUpEvent,
} as const;
