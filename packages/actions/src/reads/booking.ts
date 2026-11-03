// Action đọc lịch hẹn / nhân sự / dịch vụ cho Trợ lý / agent (TIP-023b R2 · DC-224). Dịch vụ là Product loại `service` / `package` (không
// có bảng Service riêng); nhân sự là bảng Staff đang hoạt động. Không trả lịch làm việc chi tiết / thông tin liên hệ nhân sự.
import { z } from 'zod';
import { defineAction } from '../define';

export const appointmentGet = defineAction({
  id: 'appointment.get',
  module: 'booking',
  title: 'actions.appointment.get.title',
  description: 'Get one appointment: customer, service, staff, time and status. Accepts id or code. Example: {"appointment_id":"LH-1004"}',
  input: z.object({ appointment_id: z.string().min(1) }),
  output: z.object({
    id: z.string(),
    code: z.string(),
    contact_id: z.string(),
    contact: z.string(),
    service_id: z.string(),
    service: z.string(),
    staff_id: z.string(),
    staff: z.string(),
    start_at: z.string(),
    end_at: z.string(),
    status: z.string(),
    note: z.string(),
    version: z.number().int(),
  }),
  permission: 'booking.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: (o) => ({ type: 'open', entity: 'appointment', id: o.id, view: 'drawer' }),
});

export const staffSearch = defineAction({
  id: 'staff.search',
  module: 'booking',
  title: 'actions.staff.search.title',
  description: 'Find active staff (technicians / consultants) by name or skill; returns staff_id for booking actions. Example: {"q":"Linh"}',
  input: z.object({ q: z.string().trim().max(80).optional(), limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ staff: z.array(z.object({ id: z.string(), name: z.string(), role: z.string(), skills: z.array(z.string()) })) }),
  permission: 'booking.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const serviceSearch = defineAction({
  id: 'service.search',
  module: 'booking',
  title: 'actions.service.search.title',
  description: 'Find bookable services (service / package products) by name or code; returns service_id (= product id) with duration and price (VND string). Example: {"q":"massage"}',
  input: z.object({ q: z.string().trim().max(80).optional(), limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ services: z.array(z.object({ id: z.string(), code: z.string(), name: z.string(), type: z.string(), duration_min: z.number().int().nullable(), price: z.string() })) }),
  permission: 'booking.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
