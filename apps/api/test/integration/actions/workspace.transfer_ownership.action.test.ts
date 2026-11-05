// Ma trận workspace.transfer_ownership (TIP-045b annex A3): đúng mã → Owner mới, Owner cũ manager; sai mã 422 OTP_INVALID; 403 không phải
// Owner; nguồn Trợ lý / agent cấm (chỉ UI). Không hoàn tác chung (đổi lại = lần chuyển có OTP mới). Luồng đủ + đồng thời: hardening-owner.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix, type Who } from '../helpers/action-matrix';

let m: Matrix;
let lan: Who;
const code = async () => {
  const owner = await m.h.platform.user.findUniqueOrThrow({ where: { id: m.h.user } });
  return /<b>(\d{6})<\/b>/.exec(m.h.mail.last(owner.email)?.html ?? '')![1]!;
};

beforeAll(async () => {
  m = await matrix('workspace.transfer_ownership');
  lan = await m.h.member('sales');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { emailVerifiedAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('workspace.transfer_ownership', () => {
  it('403 sales · nguồn assistant / api cấm (agent không gửi được qua HTTP; policy UI_ONLY + unit) · sai mã → OTP_INVALID', async () => {
    await m.seed('workspace.request_transfer_otp', { to_user_id: lan.id });
    expect((await m.act({ to_user_id: lan.id, otp: '000000' }, m.sales)).status).toBe(403);
    for (const src of ['assistant', 'api']) expect((await m.act({ to_user_id: lan.id, otp: '000000' }, undefined, { 'x-action-source': src })).status).toBe(403);
    const ok = await code();
    expect((await m.act({ to_user_id: lan.id, otp: ok === '000000' ? '999999' : '000000' })).body.error.code).toBe('OTP_INVALID');
  });

  it('happy: Owner mới, Owner cũ manager; action_log không chứa mã', async () => {
    const otp = await code();
    const r = await m.act({ to_user_id: lan.id, otp });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ owner_user_id: lan.id, previous_owner_role: 'manager' });
    expect(r.body.data.undo_until).toBeUndefined();
    const roles = await m.h.platform.membership.findMany({ where: { workspaceId: m.h.ws, userId: { in: [lan.id, m.h.user] } } });
    expect(Object.fromEntries(roles.map((x) => [x.userId === lan.id ? 'new' : 'old', x.roleKey]))).toEqual({ new: 'owner', old: 'manager' });
    const log = await (await m.db()).actionLog.findUniqueOrThrow({ where: { id: r.body.data.action_log_id } });
    expect(JSON.stringify(log.input)).not.toContain(otp);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
