// Nhãn / màu hiển thị của Khách hàng (prototype L2451–2984) — một nguồn cho mock FE + API thật (GET /v1/contacts, /stats).
export const CONTACT_STAGES = ['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost'] as const;
export type ContactStage = (typeof CONTACT_STAGES)[number];

/** Cột kanban + chip lọc (prototype: không có cột "lost"). */
export const STAGE_COLOR: Record<'all' | Exclude<ContactStage, 'lost'>, string> = {
  all: '#6B7280',
  lead: '#2B9EF3',
  potential: '#F59E0B',
  consulting: '#7C3AED',
  quote: '#EC4899',
  contract: '#0F6E50',
  won: '#22C55E',
};

export const CONTACT_SOURCES = ['zalo_personal', 'email', 'website', 'manual', 'referral'] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const SOURCE_STYLE: Record<ContactSource, { label: string; color: string }> = {
  manual: { label: 'Nhập tay', color: '#111111' },
  email: { label: 'Email', color: '#1F8A4D' },
  website: { label: 'Website', color: '#0E9B94' },
  referral: { label: 'Giới thiệu', color: '#C9820B' },
  zalo_personal: { label: 'Zalo cá nhân', color: '#0068FF' },
};

/** Nguồn khách từ loại kênh (contact_identity.channel_type) — webchat → website. */
export const sourceOfChannel = (channelType: string): ContactSource =>
  channelType === 'zalo_personal' ? 'zalo_personal' : channelType === 'email' ? 'email' : channelType === 'webchat' ? 'website' : 'manual';

/** Màu thẻ (tag_defs của bảng Khách hàng) suy từ màu gốc của thẻ: viền = màu thẻ, nền nhạt, chữ đậm. */
export function tagTone(hex: string): { line: string; bg: string; fg: string } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { line: '#6B7280', bg: '#F3F4F6', fg: '#374151' };
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const mix = (c: number, t: number, w: number) => Math.round(c * (1 - w) + t * w);
  const hx = (x: number) => x.toString(16).padStart(2, '0');
  const to = (w: number, t: number) => `#${hx(mix(r, t, w))}${hx(mix(g, t, w))}${hx(mix(b, t, w))}`.toUpperCase();
  return { line: `#${m[1]!.toUpperCase()}`, bg: to(0.9, 255), fg: to(0.45, 0) };
}

/** Hue avatar ổn định theo id (bảng / kanban — prototype `avatar_hue`, `owner_hue`). */
export function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Chữ viết tắt từ họ tên tiếng Việt: tên + họ ("Nguyễn Thị Lan" → "LN"). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts.at(-1)!;
  const last = parts.length > 1 ? parts[0]! : '';
  return (first[0]! + (last[0] ?? '')).toUpperCase();
}
