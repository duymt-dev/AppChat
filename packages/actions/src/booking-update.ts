// Sửa lịch hẹn (TIP-023b SPEC C): giờ / dịch vụ / nhân sự / ghi chú / nhắc / trường tuỳ biến — không nhận trạng thái, thanh toán hay trừ
// buổi liệu trình. Đổi giờ hoặc nhân sự = dời lịch (+1 lần dời, nhắc lại từ đầu); chỉ ghi chú / tuỳ biến thì không. `if_version` lệch → 409.
import { z } from 'zod';
import { customValuesSchema } from '@appchat/shared';
import { defineAction } from './define';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hm = z.string().regex(/^\d{2}:\d{2}$/);

export const appointmentUpdate = defineAction({
  id: 'appointment.update',
  module: 'booking',
  title: 'actions.appointment.update.title',
  description:
    'Edit an appointment: time, service, staff, note, reminder or custom fields (status / payment / package sessions are not editable here). Moving time or staff counts as a reschedule; the new slot must be free. Example: {"appointment_id":"LH-1004","patch":{"start":"14:00","note":"Khách muốn phòng riêng"}}',
  input: z.object({
    appointment_id: z.string().min(1),
    patch: z
      .object({
        date: date.optional(),
        start: hm.optional(),
        service_id: z.string().min(1).optional(),
        staff_id: z.string().min(1).optional(),
        note: z.string().max(2000).optional(),
        reminder_min: z.number().int().min(0).max(10_080).nullable().optional(),
        custom: customValuesSchema.optional(),
        /** Thuộc cơ hội (TIP-026c) — null = bỏ gắn. */
        opportunity_id: z.string().min(1).nullable().optional(),
      })
      .refine((p) => Object.values(p).some((v) => v !== undefined), { message: 'nothing to change' }),
    if_version: z.number().int().optional(),
  }),
  output: z.object({ appointment_id: z.string(), status: z.string(), version: z.number().int() }),
  permission: 'booking.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['calendar', 'packages'],
  uiTarget: (o) => ({ type: 'open', entity: 'appointment', id: o.appointment_id, view: 'drawer' }),
});
