// Chính sách SLA mặc định + giờ làm việc mặc định của workspace mới (Blueprint §2.2 `sla_policy` is_default: FRT người 10 phút,
// TTR người 240 phút; prototype L7590–7700). TIP-013 trả cho `GET /v1/settings/sla`; TIP-034 seed bảng `sla_policy` từ đây.
export const SLA_ESCALATIONS = ['warn_80', 'frt_breach', 'ttr_breach', 'ai_low', 'vip_wait'] as const;
export type SlaEscalation = (typeof SLA_ESCALATIONS)[number];

/** Id cố định của các gói SLA cài sẵn (Mặc định giữ 0000...0034 để tương thích TIP-034). */
export const DEFAULT_SLA_POLICY_ID = '00000000-0000-7000-8000-000000000034';
export const VIP_SLA_POLICY_ID = '00000000-0000-7000-8000-000000000035';
export const SOCIAL_SLA_POLICY_ID = '00000000-0000-7000-8000-000000000036';

export const SLA_DEFAULT = {
  name: 'Mặc định',
  color: '#2563EB',
  frt_ai: 0,
  frt_human: 10,
  ttr_ai: 30,
  ttr_human: 240,
  escalation: [
    { key: 'warn_80', color: '#F59E0B', on: true },
    { key: 'frt_breach', color: '#DC2626', on: true },
    { key: 'ttr_breach', color: '#DC2626', on: true },
    { key: 'ai_low', color: '#6E48E6', on: true },
    { key: 'vip_wait', color: '#2563EB', on: false },
  ] satisfies { key: SlaEscalation; color: string; on: boolean }[],
} as const;

export interface SlaPreset {
  readonly id: string;
  readonly key: 'std' | 'vip' | 'soc';
  readonly name: string;
  readonly isDefault: boolean;
  readonly color: string;
  readonly frt_ai: number;
  readonly frt_human: number;
  readonly ttr_ai: number;
  readonly ttr_human: number;
}

/** Các gói SLA seed sẵn theo workspace (TIP-014c): Mặc định + VIP + Mạng xã hội. */
export const SLA_PRESETS: readonly SlaPreset[] = [
  {
    id: DEFAULT_SLA_POLICY_ID,
    key: 'std',
    name: SLA_DEFAULT.name,
    isDefault: true,
    color: SLA_DEFAULT.color,
    frt_ai: SLA_DEFAULT.frt_ai,
    frt_human: SLA_DEFAULT.frt_human,
    ttr_ai: SLA_DEFAULT.ttr_ai,
    ttr_human: SLA_DEFAULT.ttr_human,
  },
  {
    id: VIP_SLA_POLICY_ID,
    key: 'vip',
    name: 'VIP',
    isDefault: false,
    color: '#C9820B',
    frt_ai: 0,
    frt_human: 2,
    ttr_ai: 15,
    ttr_human: 60,
  },
  {
    id: SOCIAL_SLA_POLICY_ID,
    key: 'soc',
    name: 'Mạng xã hội',
    isDefault: false,
    color: '#0E9B7E',
    frt_ai: 0,
    frt_human: 15,
    ttr_ai: 30,
    ttr_human: 120,
  },
];

export interface WorkingDay {
  /** 0 = Thứ Hai … 6 = Chủ nhật. */
  day: number;
  on: boolean;
  from: string;
  to: string;
}

/** T2–T6 08:00–18:00, T7 08:00–12:00, CN nghỉ (prototype L7660). */
export const DEFAULT_WORKING_DAYS: readonly WorkingDay[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  on: day < 6,
  from: '08:00',
  to: day === 5 ? '12:00' : '18:00',
}));

/** Nhãn múi giờ ở thẻ Giờ làm việc (prototype "GMT+7 · Hà Nội"). */
export function tzLabel(timezone: string): string {
  if (timezone === 'Asia/Ho_Chi_Minh') return 'GMT+7 · Hà Nội';
  return timezone === 'UTC' ? 'GMT+0 · UTC' : timezone;
}
