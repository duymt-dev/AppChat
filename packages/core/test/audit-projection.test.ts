// TIP-045b annex A2 — chiếu audit an toàn: danh mục sự kiện bảo mật (rbac §7), input / kết quả audit không còn mã OTP / credential /
// nội dung tin / prompt / URL có token (kể cả lồng sâu), trạng thái OK / Warn / Escalated, con trỏ ổn định từ chối dữ liệu lạ.
import { describe, expect, it } from 'vitest';
import { getAction } from '@appchat/actions';
import { aiActorOf, aiAuditStatusOf, auditSafe, auditStatusOf, isSecurityAction, platformAudited, SECURITY_ACTIONS } from '../src/kernel/audit';
import { decodeCursor, encodeCursor } from '../src/kernel/audit/audit-read.service';

describe('sự kiện bảo mật', () => {
  it('đủ nhóm rbac §7 + phiên thiết bị mới; mọi id có trong registry', () => {
    for (const id of ['member.set_role', 'member.invite', 'member.remove', 'channel.disconnect', 'channel.email.connect', 'contact.export', 'workspace.transfer_ownership', 'session.new_device'])
      expect(isSecurityAction(id), id).toBe(true);
    for (const id of SECURITY_ACTIONS) expect(getAction(id), id).toBeTruthy();
    expect(isSecurityAction('contact.update')).toBe(false);
    expect(platformAudited('admin.invoice.confirm_transfer')).toBe(true);
    expect(platformAudited('working_hours.update')).toBe(false);
  });
});

describe('auditSafe', () => {
  it('bỏ OTP / mật khẩu / token / nội dung / URL ký kể cả lồng sâu; giữ id + trường thường', () => {
    const def = getAction('workspace.transfer_ownership')!;
    const out = auditSafe(def, { to_user_id: 'u1', otp: '123456', nested: { password: 'p', body: 'chào', sign_url: 'https://x/s?t=abc', ok: 1 }, list: [{ token: 't', id: 'k' }] });
    expect(JSON.stringify(out)).not.toMatch(/123456|chào|abc|"p"|"t"/);
    expect(out).toMatchObject({ to_user_id: 'u1', nested: { ok: 1 }, list: [{ id: 'k' }] });
    const conn = auditSafe(getAction('channel.email.connect')!, { email: 'a@b.vn', fields: { password: 'imap-secret' } });
    expect(JSON.stringify(conn)).not.toContain('imap-secret');
    expect(auditSafe(undefined, undefined)).toBeUndefined();
  });
});

describe('trạng thái + actor', () => {
  it('action: succeeded → ok, còn lại warn; run: lỗi / huỷ → warn, chuyển người / chờ duyệt → escalated', () => {
    expect([auditStatusOf('succeeded'), auditStatusOf('failed'), auditStatusOf('undone')]).toEqual(['ok', 'warn', 'warn']);
    expect(['completed', 'failed', 'cancelled', 'handoff', 'waiting_approval'].map(aiAuditStatusOf)).toEqual(['ok', 'warn', 'warn', 'escalated', 'escalated']);
    expect(['assistant', 'agent_reply', 'delegate', 'task'].map(aiActorOf)).toEqual(['copilot', 'agent', 'agent', 'task']);
  });
});

describe('con trỏ', () => {
  it('khứ hồi; dữ liệu lạ / id không phải uuid → null', () => {
    const at = new Date('2026-11-05T01:02:03.004Z');
    const id = '0190f000-0000-7000-8000-000000000001';
    expect(decodeCursor(encodeCursor(at, id))).toEqual({ at, id });
    expect(decodeCursor(Buffer.from('x|1').toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from(`${at.toISOString()}|1;DROP`).toString('base64url'))).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });
});
