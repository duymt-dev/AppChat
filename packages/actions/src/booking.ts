// Lịch hẹn (Blueprint §3.4 booking; §2.2 appointment; COMMERCE §6 liệu trình, 8b gợi ý tạo đơn). Prototype L3871–4234.
// pending → confirmed → in_progress (check-in) → done | no_show; cancelled (lý do bắt buộc); đổi giờ giữ cùng mã, tăng reschedule_count.
import { z } from 'zod';
import { customValuesSchema } from '@appchat/shared';
import { defineAction } from './define';

const apptId = z.string().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hm = z.string().regex(/^\d{2}:\d{2}$/);
const out = z.object({ appointment_id: z.string(), status: z.string() });
const opened = (o: { appointment_id: string }) => ({
  type: 'open' as const,
  entity: 'appointment',
  id: o.appointment_id,
  view: 'drawer' as const,
});

export const appointmentFindSlots = defineAction({
  id: 'appointment.find_slots',
  module: 'booking',
  title: 'actions.appointment.find_slots.title',
  description:
    'Find free time slots for a service on a date (staff skills, opening hours, existing bookings + buffer). Example: {"service_id":"sv1","date":"2026-06-25"}',
  // exclude_id: khi đổi giờ, bỏ qua chính lịch đang dời.
  input: z.object({ service_id: z.string().min(1), date, staff_id: z.string().optional(), exclude_id: z.string().optional() }),
  output: z.object({ slots: z.array(z.object({ start: z.string(), end: z.string(), staff_ids: z.array(z.string()) })) }),
  permission: 'booking.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

export const appointmentList = defineAction({
  id: 'appointment.list',
  module: 'booking',
  title: 'actions.appointment.list.title',
  description:
    'List appointments in a date range (YYYY-MM-DD, inclusive), optionally by staff / status / customer. Example: {"from":"2026-06-24","to":"2026-06-24","status":"pending"}',
  input: z.object({
    from: date,
    to: date,
    staff_id: z.string().optional(),
    status: z.string().optional(),
    contact_id: z.string().optional(),
  }),
  output: z.object({
    appointments: z.array(z.object({ appointment_id: z.string(), code: z.string(), contact_name: z.string(), service: z.string(), staff: z.string(), start_at: z.string(), status: z.string() })),
  }),
  permission: 'booking.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const appointmentCreate = defineAction({
  id: 'appointment.create',
  module: 'booking',
  title: 'actions.appointment.create.title',
  description:
    'Book an appointment in a free slot (rejected with CONFLICT if the staff is busy). If the customer has an active package for the service it is attached automatically. Example: {"contact_id":"ct_lan","contact_name":"Nguyễn Thị Lan","service_id":"sv1","staff_id":"s2","date":"2026-06-25","start":"09:00"}',
  input: z.object({
    contact_id: z.string().optional(),
    contact_name: z.string().trim().min(1).max(120),
    phone: z.string().max(30).optional(),
    service_id: z.string().min(1),
    staff_id: z.string().min(1),
    date,
    start: hm,
    status: z.enum(['pending', 'confirmed']).optional(),
    reminder_min: z.number().int().min(0).max(10_080).optional(),
    note: z.string().max(2000).optional(),
    /** Hội thoại khách đặt lịch (Hộp thư / agent / Trợ lý) — nhắc hẹn đi qua đây; phải thấy được + đúng khách (TIP-025b §D.1). */
    conversation_id: z.string().optional(),
    source_message_id: z.string().optional(),
    /** Trường tuỳ biến (D56) — validate theo định nghĩa ở Executor. */
    custom: customValuesSchema.optional(),
    /** Thuộc cơ hội (TIP-026c): demo / tư vấn hoàn thành → gợi ý chuyển giai đoạn (không tự đổi). */
    opportunity_id: z.string().min(1).nullable().optional(),
  }),
  output: z.object({ appointment_id: z.string(), code: z.string(), package_id: z.string().nullable() }),
  permission: 'booking.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['calendar', 'packages'],
  uiTarget: opened,
});

export const appointmentConfirm = defineAction({
  id: 'appointment.confirm',
  module: 'booking',
  title: 'actions.appointment.confirm.title',
  description:
    'Confirm a pending appointment, or reconfirm an expired hold for the SAME slot (same staff / time / package) when it is still free and in the future — never moves it; if the slot or package is no longer valid it fails (409) and a new booking is needed. Pass if_version (the appointment version you saw) to refuse a stale change. Example: {"appointment_id":"ap_1215","if_version":2}',
  input: z.object({ appointment_id: apptId, if_version: z.number().int().positive().optional() }),
  output: out.extend({ version: z.number().int().optional() }),
  permission: 'booking.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['calendar', 'packages'],
});

export const appointmentReschedule = defineAction({
  id: 'appointment.reschedule',
  module: 'booking',
  title: 'actions.appointment.reschedule.title',
  description:
    'Move an appointment to another free slot (same code, reschedule_count + 1). Example: {"appointment_id":"ap_1215","date":"2026-06-27","start":"14:00","staff_id":"s2"}',
  input: z.object({ appointment_id: apptId, date, start: hm, staff_id: z.string().optional() }),
  output: out,
  permission: 'booking.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['calendar', 'packages'],
});

export const appointmentCancel = defineAction({
  id: 'appointment.cancel',
  module: 'booking',
  title: 'actions.appointment.cancel.title',
  description: 'Cancel an appointment; reason required. Example: {"appointment_id":"ap_1215","reason":"Khách bận"}',
  input: z.object({ appointment_id: apptId, reason: z.string().trim().min(1).max(500) }),
  output: out,
  permission: 'booking.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['calendar', 'packages'],
});

export const appointmentCheckIn = defineAction({
  id: 'appointment.check_in',
  module: 'booking',
  title: 'actions.appointment.check_in.title',
  description: 'Customer arrived (confirmed / pending → in_progress).',
  input: z.object({ appointment_id: apptId }),
  output: out,
  permission: 'booking.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['calendar', 'packages'],
});

export const appointmentComplete = defineAction({
  id: 'appointment.complete',
  module: 'booking',
  title: 'actions.appointment.complete.title',
  description:
    'Finish an appointment (→ done). If it belongs to a package, one session is deducted; otherwise an order is only SUGGESTED (COMMERCE 8b). No loyalty points here.',
  input: z.object({ appointment_id: apptId }),
  output: out.extend({
    package: z.object({ id: z.string(), used: z.number(), total: z.number() }).nullable(),
    suggest_order: z.boolean(),
  }),
  permission: 'booking.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['calendar', 'packages'],
});

export const appointmentMarkNoShow = defineAction({
  id: 'appointment.mark_no_show',
  module: 'booking',
  title: 'actions.appointment.mark_no_show.title',
  description: 'Customer did not come (→ no_show). By default no package session is deducted (COMMERCE §6).',
  input: z.object({ appointment_id: apptId }),
  output: out,
  permission: 'booking.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['calendar', 'packages'],
});
