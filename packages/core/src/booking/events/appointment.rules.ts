// WS lịch hẹn (TIP-016b): mọi topic vòng đời `appointment.*` → event `appointment.updated` (chỉ id + topic) cho người có booking.view và
// lịch trong scope đọc (policy booking chung: người phụ trách / nhóm / quan hệ khách — tra lúc phát). FE làm mới lịch + badge rail (REST
// chiếu theo quyền lúc đọc). Chỉ phụ thuộc shared + notify — nạp ở notify/events/domain.rules.ts.
import { appointmentEvent } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';
import { appointmentRecord } from '../../notify/realtime/records';

export const APPOINTMENT_TOPICS = [
  'appointment.created',
  'appointment.confirmed',
  'appointment.rescheduled',
  'appointment.checked_in',
  'appointment.completed',
  'appointment.no_show',
  'appointment.cancelled',
  'appointment.expired',
] as const;

for (const topic of APPOINTMENT_TOPICS)
  registerRealtimeRule(`booking.${topic}`, topic, (e) => {
    const p = appointmentEvent.parse(e.payload);
    return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'appointment.updated', data: { appointment_id: p.appointment_id, change: topic }, require: { permission: 'booking.view', record: appointmentRecord(p) } }];
  });
