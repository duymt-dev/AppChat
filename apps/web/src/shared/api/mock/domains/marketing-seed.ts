// Seed Marketing của mock (TIP-037): chuyển fixture prototype (fixtures/prototype-parity/marketing.json — CAMP L8730) sang đúng DTO server
// (packages/shared/src/api/marketing.ts). Id phân khúc / khách / tài khoản là uuid như server (action kiểm uuid). Zalo cá nhân không có xác
// nhận đọc / click → open / click = null (DC-240) — số "mở / click" của prototype không đưa vào DTO.
import type { CampaignDto, CampaignStatusKey, CampaignSuggestionDto, MarketingCustomer, RecipientDto, SegmentDto, SenderAccount } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/marketing.json';

export type MockCampaign = CampaignDto & { recipients: RecipientDto[]; deleted?: boolean; suggestion_id: string | null; created_by: string };
export type MockSuggestion = CampaignSuggestionDto;

const uuid = (n: number, tail = 0) => `0190f000-0000-7000-8000-${String(tail).padStart(4, '0')}${String(n).padStart(8, '0')}`;
export const MOCK_UUID = uuid;

export const NOW = '2026-06-24T02:00:00.000Z';
const iso = (dd: string, hh = '08:00') => {
  const [d, m] = dd.split('/');
  return `2026-${m}-${d}T${hh}:00+07:00`;
};

/** Tài khoản gửi (mock = tài khoản Zalo cá nhân + hộp Email của Cài đặt › Kênh). */
export const ACCOUNTS: SenderAccount[] = [
  { id: uuid(1, 9100), type: 'zalo_personal', name: 'Zalo · Trâm Spa', status: 'connected', daily_cap: 200 },
  { id: uuid(2, 9100), type: 'email', name: 'hello@tramspa.vn', status: 'connected', daily_cap: null },
];
export const accountOf = (ch: 'zalo' | 'email') => ACCOUNTS[ch === 'zalo' ? 0 : 1]!;

const FILTERS: Record<string, SegmentDto['filter']> = {
  vip: { field: 'group', op: 'in', value: ['vip'] },
  returning: { field: 'group', op: 'in', value: ['loyal'] },
  cart: { field: 'order_count', op: 'lte', value: 0 },
  new: { field: 'group', op: 'in', value: ['new'] },
  cold: { field: 'last_interaction_at', op: 'older_than_days', value: 90 },
};

/** Phân khúc đã lưu — khoá prototype (vip / returning …) giữ trong `key` để seed gợi ý trỏ đúng. */
export const SEGMENTS: (SegmentDto & { key: string })[] = fixture.segments.map(([key, name, count], i) => ({
  key: key as string,
  id: uuid(i + 1, 9200),
  name: name as string,
  filter: FILTERS[key as string] ?? { field: 'group', op: 'in', value: ['potential'] },
  is_dynamic: true,
  last_count: count as number,
  version: 1,
  updated_at: NOW,
}));

const GROUP_OF: Record<string, string> = { vip: 'vip', returning: 'loyal', new: 'new', cart: 'potential', cold: 'potential' };

export const CUSTOMERS: MarketingCustomer[] = fixture.customers.map(([name, phone, email, group, label], i) => ({
  id: uuid(i + 1, 9300),
  name: name!,
  phone: phone!,
  email: email!,
  // Nhóm theo `contact.group` của server (vip / loyal / new / potential) — nhóm prototype quy về gần nhất.
  group: GROUP_OF[group!] ?? 'potential',
  label: label!,
}));

/** Người nhận mẫu (prototype mkRecipients) — trạng thái theo bằng chứng kênh: không có "đã đọc / click" cho Zalo cá nhân. */
const recipients = (campaignId: string, sent: boolean): RecipientDto[] =>
  fixture.recipients.map(([name, phone, st, at], i) => {
    const failed = st === 'failed';
    const replied = st === 'clicked';
    return {
      id: uuid(i + 1, Number(campaignId.slice(-4)) % 9000),
      contact_id: uuid(i + 1, 9400),
      conversation_id: null,
      name: name!,
      endpoint: phone!,
      status: !sent ? 'pending' : failed ? 'failed' : replied ? 'replied' : 'sent',
      skip_reason: null,
      outcome: !sent ? null : failed ? 'failed' : 'accepted',
      variant: i % 2 ? 'b' : 'a',
      sent_at: sent && at ? iso(at.slice(0, 5), at.slice(6, 11)) : null,
      replied_at: sent && replied ? iso(at!.slice(0, 5), at!.slice(6, 11)) : null,
      read_at: null,
    };
  });

const STARTED: CampaignStatusKey[] = ['running', 'paused', 'completed'];

export function seedCampaigns(): MockCampaign[] {
  return fixture.campaigns.map((c) => {
    const status = c.status as CampaignStatusKey;
    const ch = c.channel as 'zalo' | 'email';
    const started = STARTED.includes(status);
    const seg = SEGMENTS.find((s) => s.name === c.segment);
    const eligible = c.est_recipients;
    const sent = started ? c.stats.sent : 0;
    const replied = started ? Math.round(c.stats.click * 0.4) : 0;
    const content = c.content as CampaignDto['content'];
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      desc: c.desc,
      channel: ch,
      kind: c.kind as CampaignDto['kind'],
      source: c.source as 'ai' | 'manual',
      status,
      version: 1,
      account_id: accountOf(ch).id,
      account_name: accountOf(ch).name,
      segment: c.segment,
      segment_ids: seg ? [seg.id] : [],
      est_recipients: eligible,
      est_credits: 0,
      date: iso(c.date),
      end: c.send === 'schedule' ? iso(c.end.slice(0, 5), c.end.slice(8, 13)) : '',
      scheduled_at: c.send === 'schedule' ? iso(c.end.slice(0, 5), c.end.slice(8, 13)) : null,
      approved_by: status === 'draft' || status === 'pending_approval' ? null : 'Trâm',
      approved_at: status === 'draft' || status === 'pending_approval' ? null : iso(c.date, '08:30'),
      stats: { eligible, sent, skipped: 0, failed: started ? 1 : 0, unknown: 0, replied, converted: Math.round(replied * 0.3), open: null, click: null, progress: c.stats.progress, revenue: String(Math.round(replied * 0.3) * 450_000) },
      capabilities: { read_receipt: false, click: false },
      content,
      ab: null,
      send: c.send as CampaignDto['send'],
      history: c.history.map(([k, by, at]) => [k!, by!, iso(at!.slice(0, 5), at!.slice(8, 13))] as [string, string, string]),
      allowed: [],
      recipients: recipients(c.id, started),
      suggestion_id: null,
      created_by: 'u_tram',
    };
  });
}

export function seedSuggestions(): MockSuggestion[] {
  return fixture.suggestions.map((s, i) => {
    const seg = SEGMENTS.find((x) => x.key === s.segs[0]);
    return {
      id: uuid(i + 1, 9500),
      kind: s.kind as MockSuggestion['kind'],
      status: 'new',
      title: s.name,
      reason: s.reason,
      est_count: s.count,
      best_time: ['09:00', '09:30', null, null][i] ?? null,
      channel: s.channels[0] as 'zalo' | 'email',
      filter: seg?.filter ?? { field: 'last_order_at', op: 'never' },
      subject: s.subject,
      body: s.body.replace('{tên}', '{ten}'),
      cta: s.cta,
      run_id: uuid(1, 9600),
      generated_at: NOW,
    };
  });
}

export const SIGNALS = ['profile', 'tags', 'orders', 'interactions', 'last_interaction', 'value', 'documents', 'campaigns'];
