// State form tạo / đổi giờ lịch hẹn: khách, dịch vụ, ngày, giờ (chỉ trong slot trống — appointment.find_slots), KTV, nhắc, trạng thái, ghi chú.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { slotsQuery } from '../api';
import type { Appointment, CalendarMeta } from '../types';

export interface ApptDraft {
  contact_name: string;
  phone: string;
  service_id: string;
  date: string;
  start: string;
  staff_id: string;
  reminder: number;
  status: 'pending' | 'confirmed';
  note: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
/** Phút nhắc trước theo 4 lựa chọn của prototype (L4017). */
export const REMINDERS = [10, 30, 60, 1440] as const;

export function initialDraft(meta: CalendarMeta, prefill: Record<string, unknown> | null, re?: Appointment): ApptDraft {
  if (re)
    return {
      contact_name: re.contact_name,
      phone: re.phone,
      service_id: re.service_id,
      date: re.start_at.slice(0, 10),
      start: '',
      staff_id: re.staff_id,
      reminder: 1440,
      status: re.status === 'confirmed' ? 'confirmed' : 'pending',
      note: re.note,
    };
  const p = prefill ?? {};
  return {
    contact_name: str(p.contact_name),
    phone: str(p.phone),
    service_id: str(p.service_id) || meta.services[0]!.id,
    // prototype đặt sẵn ngày mai (21/06 khi hôm nay 20/06)
    date: str(p.date) || nextDay(meta.today),
    start: str(p.start),
    staff_id: str(p.staff_id),
    reminder: 30,
    status: 'pending',
    note: str(p.note),
  };
}
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

export function useApptForm(init: ApptDraft, meta: CalendarMeta, excludeId = '') {
  const [d, setD] = useState(init);
  const set = <K extends keyof ApptDraft>(k: K, v: ApptDraft[K]) =>
    setD((s) => ({ ...s, [k]: v, ...(k === 'service_id' || k === 'date' || k === 'staff_id' ? { start: '' } : {}) }));
  const slots = useQuery(slotsQuery(d.service_id, d.date, d.staff_id, excludeId)).data?.slots ?? [];
  const slot = slots.find((x) => x.start === d.start);
  const service = meta.services.find((s) => s.id === d.service_id);
  /** KTV chốt khi lưu: KTV đã chọn, hoặc KTV trống đầu tiên của slot. */
  const staff = d.staff_id || slot?.staff_ids[0] || '';
  const valid = !!d.contact_name.trim() && !!d.service_id && !!slot;
  return { d, set, slots, slot, service, staff, valid };
}
