// Đọc cấu hình lịch hẹn cho Trợ lý (TIP-033b §1.3): `booking.settings_get` — giờ mở cửa 7 thứ, bước lưới, đệm, no-show, version + trang
// nhân sự (ca riêng tri-state). Quyền booking.config, agentGrantable=false (agent không đọc / sửa cấu hình); cùng reader với GET /settings/booking.
import { z } from 'zod';
import { defineAction } from './define';

const day = z.object({ weekday: z.number().int(), open: z.boolean(), start: z.string(), end: z.string() });

export const bookingSettingsGet = defineAction({
  id: 'booking.settings_get',
  module: 'booking',
  title: 'actions.booking.settings_get.title',
  description:
    'Read booking settings: opening hours per weekday (0 = Monday), slot step, default buffer, no-show rule, version, and a page of staff with their own schedule (weekday omitted = follows opening hours, open=false = day off). Call before proposing a business_hours.update / staff.update. Example: {}',
  input: z.object({ staff_cursor: z.string().max(200).optional(), staff_limit: z.number().int().min(1).max(100).optional() }),
  output: z.object({
    days: z.array(day),
    slot_step_min: z.number().int(),
    default_buffer_min: z.number().int(),
    no_show_deducts: z.boolean(),
    version: z.number().int(),
    staff: z.array(z.object({ id: z.string(), name: z.string(), role: z.string(), active: z.boolean(), skills: z.array(z.string()), schedule: z.array(day), version: z.number().int() })),
    staff_next_cursor: z.string().nullable(),
  }),
  permission: 'booking.config',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
