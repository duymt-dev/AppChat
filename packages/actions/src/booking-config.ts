// Cấu hình lịch hẹn (Blueprint §3.4 booking: staff.* / business_hours.update — `booking.config`) + tạo đơn từ lịch hẹn (§3.4 sales
// `order.create_from_appointment` — gợi ý 8b, người / agent xác nhận). Nhân sự: tên, vai trò, màu, nhóm, phòng, dịch vụ làm được, ca riêng.
import { z } from 'zod';
import { defineAction } from './define';

// TIP-033b §3.2: giờ 00–23:00–59 (không nhận 29:00); open=false là nghỉ (giờ bỏ qua); if_version tuỳ chọn (lệch → STALE_VERSION).
const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const ifVersion = z.number().int().positive().optional();
const version = z.number().int().optional();
const day = z.object({ weekday: z.number().int().min(0).max(6), open: z.boolean(), start: hm, end: hm });
const staffFields = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().max(60).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  team: z.string().trim().max(40).optional(),
  room: z.string().trim().max(60).optional(),
  user_id: z.string().optional(),
  /** Dịch vụ làm được (id sản phẩm loại service); rỗng = mọi dịch vụ. */
  skills: z.array(z.string()).max(200).optional(),
  /** Ca riêng theo thứ (0 = Thứ Hai): thứ không có = theo giờ mở cửa; open=false = nghỉ; open=true = giờ riêng (∩ giờ mở cửa). */
  schedule: z.array(day).max(7).optional(),
});

export const staffCreate = defineAction({
  id: 'staff.create',
  module: 'booking',
  title: 'actions.staff.create.title',
  description: 'Add a staff member who performs services. Example: {"name":"KTV. Mai Lan","role":"KTV da","skills":["<service id>"]}',
  input: staffFields,
  output: z.object({ staff_id: z.string(), version }),
  permission: 'booking.config',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['calendar', 'settings'],
});

export const staffUpdate = defineAction({
  id: 'staff.update',
  module: 'booking',
  title: 'actions.staff.update.title',
  description: 'Update a staff member (name, role, color, team, room, services, own schedule). schedule replaces all own days: omitted weekday = follows opening hours, open=false = day off.',
  input: z.object({ staff_id: z.string().min(1), patch: staffFields.partial(), if_version: ifVersion }),
  output: z.object({ staff_id: z.string(), version }),
  permission: 'booking.config',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['calendar', 'settings'],
});

export const staffDeactivate = defineAction({
  id: 'staff.deactivate',
  module: 'booking',
  title: 'actions.staff.deactivate.title',
  description: 'Deactivate a staff member (no new bookings; existing appointments stay). Rejected while they have an appointment in progress or an upcoming held one.',
  input: z.object({ staff_id: z.string().min(1), if_version: ifVersion }),
  output: z.object({ staff_id: z.string(), version }),
  permission: 'booking.config',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['calendar', 'settings'],
});

export const businessHoursUpdate = defineAction({
  id: 'business_hours.update',
  module: 'booking',
  title: 'actions.business_hours.update.title',
  description:
    'Set booking opening hours per weekday (0 = Monday), slot grid step and default buffer, and whether a no-show deducts a package session. Example (days = 7 entries, 0 = Monday): {"days":[{"weekday":0,"open":true,"start":"08:00","end":"19:00"},{"weekday":1,"open":true,"start":"08:00","end":"19:00"},{"weekday":2,"open":true,"start":"08:00","end":"19:00"},{"weekday":3,"open":true,"start":"08:00","end":"19:00"},{"weekday":4,"open":true,"start":"08:00","end":"19:00"},{"weekday":5,"open":true,"start":"08:00","end":"19:00"},{"weekday":6,"open":false,"start":"08:00","end":"19:00"}],"slot_step_min":30}',
  input: z.object({
    days: z.array(day).length(7),
    slot_step_min: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(60)]).optional(),
    default_buffer_min: z.number().int().min(0).max(240).optional(),
    no_show_deducts: z.boolean().optional(),
    if_version: ifVersion,
  }),
  output: z.object({ ok: z.boolean(), version }),
  permission: 'booking.config',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['calendar', 'settings'],
});

export const orderCreateFromAppointment = defineAction({
  id: 'order.create_from_appointment',
  module: 'sales',
  title: 'actions.order.create_from_appointment.title',
  description:
    'Create an order for a finished appointment that is not part of a package (COMMERCE 8b — only after the user / agent confirms the suggestion). One order per appointment. Example: {"appointment_id":"<id>"}',
  input: z.object({ appointment_id: z.string().min(1) }),
  output: z.object({ order_id: z.string(), code: z.string() }),
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['orders', 'calendar'],
  uiTarget: (o: { order_id: string }) => ({ type: 'open' as const, entity: 'order', id: o.order_id, view: 'drawer' as const }),
});
