// Đọc Lịch hẹn (Blueprint §4.4 booking). Ghi qua useAction (appointment.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Appointment, CalFilter, CalendarMeta, Slot } from './types';
import { customParams } from '@/shared/custom-fields';

export const apptsQuery = (f: CalFilter, from: string, to: string) =>
  queryOptions({
    queryKey: ['calendar', 'list', f, from, to],
    queryFn: () =>
      transport.get<{ data: Appointment[] }>('/calendar', {
        from,
        to,
        team: f.team,
        staff_id: f.staff_id,
        status: f.status,
        ...(f.q ? { q: f.q } : {}),
        ...customParams(f.custom),
      }),
    placeholderData: (prev) => prev,
    enabled: !!from,
  });

export const apptQuery = (id: string) =>
  queryOptions({ queryKey: ['calendar', 'one', id], queryFn: () => transport.get<Appointment>(`/calendar/${id}`) });

export const calendarMetaQuery = () =>
  queryOptions({ queryKey: ['calendar', 'meta'], queryFn: () => transport.get<CalendarMeta>('/calendar/meta') });

export const slotsQuery = (service_id: string, date: string, staff_id: string, exclude_id = '') =>
  queryOptions({
    queryKey: ['calendar', 'slots', service_id, date, staff_id, exclude_id],
    queryFn: () =>
      transport.get<{ slots: Slot[] }>('/calendar/slots', {
        service_id,
        date,
        ...(staff_id ? { staff_id } : {}),
        ...(exclude_id ? { exclude_id } : {}),
      }),
    enabled: !!service_id && !!date,
  });
