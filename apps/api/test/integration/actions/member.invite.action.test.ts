// Ma trận member.invite (TIP-023b): mời thành viên (risk send, db platform) → email · vai trò; lời mời cũ cùng email còn chờ → cảnh báo
// thay; đã là thành viên → 409 ở preview. 403 sales (không có members.manage). Idempotency theo khoá (send). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { testEmail } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('member.invite');
  // Gói Team (5 người) — mặc định 1 người, harness đã có owner + sales + cs.
  const team = await m.h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await m.h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: m.h.ws, planId: team.id, status: 'active', currentPeriodStart: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('member.invite', () => {
  it('403 sales', async () => {
    expect((await m.act({ email: testEmail('x'), role: 'cs' }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận (thư mời gửi); mời lại → cảnh báo thay lời mời cũ; đã là thành viên → 409', async () => {
    const email = testEmail('lan');
    const { preview, done } = await m.confirm({ email, name: 'Lan', role: 'sales' });
    expect(preview).toEqual({ summary: `${email} · sales`, risk: 'send', changes: [{ entity: 'invite', after: { email, name: 'Lan', role: 'sales' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(m.h.mail.last(email)).toBeDefined();
    expect((await m.confirm({ email, role: 'cs' })).preview.warnings).toEqual(['replaces_pending_invite']);
    const salesEmail = (await m.h.platform.user.findUniqueOrThrow({ where: { id: m.sales.id } })).email;
    const r = await m.act({ email: salesEmail, role: 'cs' }, undefined, { 'x-action-source': 'assistant' });
    expect([r.status, r.body.error.fields]).toEqual([409, { email: 'already_member' }]);
  });

  it('idempotency', async () => {
    const i = { email: testEmail('idem'), role: 'cs' };
    const r = await m.actWithKey('mi-idem', i);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((await m.actWithKey('mi-idem', i)).body.data.result).toEqual(r.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
