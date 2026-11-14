// Mock mail của DN (TIP-012c): người gửi suy từ thẻ connector Brevo / SMTP của mock (kết nối / ngắt ở Nền tảng kết nối đổi danh sách) —
// cùng shape `MailSenderDto` với server. Brevo kết nối → một người gửi đã xác minh; SMTP kết nối → người gửi chưa xác nhận (đăng nhập + TLS
// không phải xác minh tên miền). Không khoá / host.
import type { CampaignSender, MailSenderDto } from '@appchat/shared';
import type { MockDb } from '../store';

const CONN = { brevo: '0196c0de-0000-7000-8000-00000000b001', smtp: '0196c0de-0000-7000-8000-00000000b002' } as const;

export function mockMailSenders(db: MockDb): MailSenderDto[] {
  const on = (k: string) => db.settingsApps.connectors.some((c) => c.key === k && c.connected);
  const out: MailSenderDto[] = [];
  if (on('brevo'))
    out.push({ connection_id: CONN.brevo, connector: 'brevo', connection_name: 'Brevo', sender_id: '7', email: 'news@annhienspa.vn', name: 'An Nhiên Spa', state: 'sender_verified', transport: 'provider_api', events: true, sender_rev: 1, usable: true, reason: null, probed_at: '2026-11-08T09:00:00.000Z' });
  if (on('smtp'))
    out.push({ connection_id: CONN.smtp, connector: 'smtp', connection_name: 'SMTP', sender_id: 'configured', email: 'hello@annhienspa.vn', name: '', state: 'unverified', transport: 'authenticated_transport', events: false, sender_rev: 1, usable: false, reason: 'sender_unconfirmed', probed_at: '2026-11-08T09:00:00.000Z' });
  return out;
}

/** Người gửi tường minh của mock campaign.create / update — người gửi lạ / chưa dùng được → 422 như server. */
export function mockSenderOf(db: MockDb, channel: string, s: { kind: string; connection_id?: string; sender_id?: string } | undefined): CampaignSender | null {
  if (s?.kind !== 'tenant_mail') return null;
  const m = mockMailSenders(db).find((x) => x.connection_id === s.connection_id && x.sender_id === s.sender_id);
  if (channel !== 'email' || !m || !m.usable) return null;
  return { kind: 'tenant_mail', connection_id: m.connection_id, sender_id: m.sender_id, sender_rev: m.sender_rev, email: m.email, name: m.name, usable: true, reason: null };
}
