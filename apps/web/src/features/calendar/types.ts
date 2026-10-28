// Kiểu dữ liệu Lịch hẹn — khớp response mock / API Blueprint §4.4 booking (§2.2 appointment, COMMERCE §6).
export type ApptStatus = 'pending' | 'confirmed' | 'in_progress' | 'done' | 'no_show' | 'cancelled';
export type CalView = 'list' | 'day' | 'week' | 'month';

export interface Appointment {
  id: string;
  code: string;
  contact_id: string;
  contact_name: string;
  phone: string;
  owner_user_id: string;
  service_id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  status: ApptStatus;
  pay: 'paid' | 'partial' | 'pending' | 'free';
  source: string;
  note: string;
  cancel_reason: string;
  reschedule_count: number;
  package_id: string | null;
  package: { id: string; name: string; used: number; total: number } | null;
  reminders: { kind: string; at: string }[];
}

export interface Service {
  id: string;
  name: string;
  color: string;
  duration: number;
  price: string;
  buffer: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  initial: string;
  color: string;
  team: string;
  room: string;
}

export interface FollowUp {
  id: string;
  at: string;
  note: string;
  contact_name: string;
  step: string;
  owner: string;
  channel: string;
  due: 'today' | 'overdue';
}

export interface CalendarMeta {
  today: string;
  open_hours: { start: string; end: string };
  services: Service[];
  staff: Staff[];
  history: { at: string; service: string }[];
  ai: [key: string, title: string, desc: string][];
  follow_ups: FollowUp[];
  stats: {
    today: number;
    confirmed: number;
    arrived: number;
    pending: number;
    hours: string;
    capacity: string;
    revenue: string;
    paid: number;
  };
}

export interface CalFilter {
  team: string;
  staff_id: string;
  status: string;
  q: string;
}

export interface Slot {
  start: string;
  end: string;
  staff_ids: string[];
}
