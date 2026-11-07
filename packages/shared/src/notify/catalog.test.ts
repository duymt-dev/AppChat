// TIP-006: danh mục thông báo ↔ tuỳ chọn FE (fixture prototype), chữ server đủ vi + en, giờ không làm phiền, event schema.
import { describe, expect, it } from 'vitest';
import fixture from '../../../../fixtures/prototype-parity/settings.json';
import { interpolate, serverMessages } from '../i18n/server';
import { notifyRequestedEvent } from '../events';
import { NOTIFY_KINDS, NOTIFY_KIND_KEYS, channelsFor, inQuietHours } from './catalog';

describe('notify catalog', () => {
  it('9 loại của prototype (Cài đặt › Thông báo) + loại ngoài prototype: Khách hàng (DC-150), Báo giá (TIP-029), Hợp đồng (TIP-030), Thu tiền (TIP-032), Liệu trình (TIP-032b), Ticket (TIP-034), đổi Chủ sở hữu (TIP-045b), sắp lưu trữ (TIP-041): nhóm + kênh mặc định', () => {
    const fromFixture = fixture.notif.groups.flatMap((g) => g.events.map((e) => ({ ...e, group: g.key })));
    const beyond = ['crm_owner', 'crm_access', 'quote_approval', 'quote_expiring', 'contract_approval', 'contract_signed', 'contract_declined', 'contract_expiring', 'payment_received', 'refund_approval', 'bank_review', 'package_reminder', 'sla_breach', 'ticket_assigned', 'ai_briefing', 'ai_task_failed', 'owner_transfer', 'security_event', 'data_job_done', 'campaign_approval', 'archive_warning'];
    expect(fromFixture.map((e) => e.key).sort()).toEqual(NOTIFY_KIND_KEYS.filter((k) => !beyond.includes(k)).sort());
    for (const k of ['crm_owner', 'crm_access', 'quote_expiring', 'contract_expiring']) expect(NOTIFY_KINDS[k as keyof typeof NOTIFY_KINDS]).toMatchObject({ group: 'msg', defaults: { desktop: true, email: false, mobile: true } });
    // Báo giá chờ duyệt: chặn việc gửi khách → mặc định thêm email.
    for (const k of ['quote_approval', 'contract_approval', 'contract_signed', 'contract_declined'] as const)
      expect(NOTIFY_KINDS[k]).toMatchObject({ group: 'msg', defaults: { desktop: true, email: true, mobile: true } });
    // Hoàn tiền chờ duyệt: tiền ra → mặc định thêm email; khách đã trả / cần đối soát: không email.
    expect(NOTIFY_KINDS.refund_approval).toMatchObject({ group: 'msg', defaults: { desktop: true, email: true, mobile: true } });
    expect(NOTIFY_KINDS.payment_received.defaults.email).toBe(false);
    expect(NOTIFY_KINDS.bank_review.defaults).toEqual({ desktop: true, email: false, mobile: false });
    expect(NOTIFY_KINDS.package_reminder).toMatchObject({ group: 'msg', defaults: { desktop: true, email: false, mobile: true } });
    // Đổi Chủ sở hữu = sự kiện bảo mật → mọi kênh mặc định bật (Owner cũ + mới).
    expect(NOTIFY_KINDS.owner_transfer).toMatchObject({ group: 'system', defaults: { desktop: true, email: true, mobile: true } });
    // Quá hạn SLA = leo thang → mặc định thêm email.
    expect(NOTIFY_KINDS.sla_breach.defaults).toEqual({ desktop: true, email: true, mobile: true });
    for (const e of fromFixture) {
      const k = NOTIFY_KINDS[e.key as keyof typeof NOTIFY_KINDS];
      expect(k.group).toBe(e.group);
      expect(k.defaults).toEqual({ desktop: e.desktop, email: e.email, mobile: e.mobile });
    }
  });

  it('chữ server có đủ vi + en cho mọi loại; locale lạ → fallback', () => {
    for (const l of ['vi', 'en']) for (const k of NOTIFY_KIND_KEYS) expect(serverMessages(l).notify.kind[k].title.length).toBeGreaterThan(3);
    expect(serverMessages('ja').notify.kind.sla_warn.title).toContain('SLA');
    expect(serverMessages('ja')).toBe(serverMessages('en'));
    expect(interpolate('A {x} {y}', { x: '<b>' }, (s) => s.replace('<', '&lt;'))).toBe('A &lt;b> {y}');
  });

  it('kênh hiệu lực: tuỳ chọn đã lưu đè mặc định', () => {
    expect(channelsFor(null, 'ai_budget')).toEqual({ desktop: false, email: true, mobile: false });
    expect(channelsFor({ events: { ai_budget: { desktop: true, email: false, mobile: false } } }, 'ai_budget').email).toBe(false);
  });

  it('giờ không làm phiền qua nửa đêm theo múi giờ workspace', () => {
    const dnd = { on: true, from: '22:00', to: '08:00' };
    expect(inQuietHours(dnd, new Date('2026-10-30T16:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe(true); // 23:00 VN
    expect(inQuietHours(dnd, new Date('2026-10-30T03:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe(false); // 10:00 VN
    expect(inQuietHours(dnd, new Date('2026-10-30T00:30:00Z'), 'Asia/Ho_Chi_Minh')).toBe(true); // 07:30 VN
    expect(inQuietHours({ ...dnd, on: false }, new Date('2026-10-30T16:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe(false);
    expect(inQuietHours({ on: true, from: '12:00', to: '13:00' }, new Date('2026-10-30T05:30:00Z'), 'Asia/Ho_Chi_Minh')).toBe(true);
  });

  it('notify.requested: cần người nhận; kind trong danh mục', () => {
    const ok = { ws: '0190f000-0000-7000-8000-000000000001', occurred_at: 'x', kind: 'sla_warn', to: { permission: 'ticket.view' } };
    expect(notifyRequestedEvent.safeParse(ok).success).toBe(true);
    expect(notifyRequestedEvent.safeParse({ ...ok, to: {} }).success).toBe(false);
    expect(notifyRequestedEvent.safeParse({ ...ok, kind: 'x' }).success).toBe(false);
  });
});
