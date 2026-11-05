// Ma trận invite.revoke (TIP-023b): thu hồi lời mời đang chờ → email · vai trò, trạng thái pending → revoked; đã thu hồi / id lạ → 404 ở
// preview. 403 sales (không có members.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { testEmail } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let email: string;
let invite: string;

beforeAll(async () => {
  m = await matrix('invite.revoke');
  // Gói Team (5 người) — mặc định 1 người, harness đã có owner + sales + cs.
  const team = await m.h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await m.h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: m.h.ws, planId: team.id, status: 'active', currentPeriodStart: m.h.clock.now() } });
  email = testEmail('rv');
  invite = (await m.seed('member.invite', { email, role: 'cs' })).invite_id;
}, 120_000);
afterAll(() => m?.close());

describe('invite.revoke', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ invite_id: invite }, m.sales)).status).toBe(403);
    expect((await m.act({ invite_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; thu hồi lại → 404 ở preview', async () => {
    const { preview, done } = await m.confirm({ invite_id: invite });
    expect(preview).toEqual({ summary: `${email} · cs`, risk: 'write', changes: [{ entity: 'invite', id: invite, before: { status: 'pending' }, after: { status: 'revoked' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.h.platform.invite.findUniqueOrThrow({ where: { id: invite } })).revokedAt).not.toBeNull();
    expect((await m.act({ invite_id: invite }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
