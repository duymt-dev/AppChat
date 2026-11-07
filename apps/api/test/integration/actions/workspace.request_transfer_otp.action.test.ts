// Ma trận workspace.request_transfer_otp (TIP-045b annex A3): Owner xin mã đổi chủ cho thành viên active → mã gửi email Owner (che khi trả);
// 403 manager / sales (không có workspace.transfer_ownership); nguồn Trợ lý / agent cấm (chỉ UI); tự chuyển cho mình → 422.
// Luồng đủ + đồng thời: hardening-owner.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix, type Who } from '../helpers/action-matrix';

let m: Matrix;
let lan: Who;

beforeAll(async () => {
  m = await matrix('workspace.request_transfer_otp');
  lan = await m.h.member('manager');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { emailVerifiedAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('workspace.request_transfer_otp', () => {
  it('403 sales / manager · nguồn assistant / api cấm (agent không gửi được qua HTTP; policy UI_ONLY + unit) · tự chuyển → 422', async () => {
    expect((await m.act({ to_user_id: lan.id }, m.sales)).status).toBe(403);
    expect((await m.act({ to_user_id: m.sales.id }, lan)).status).toBe(403);
    for (const src of ['assistant', 'api']) expect((await m.act({ to_user_id: lan.id }, undefined, { 'x-action-source': src })).status).toBe(403);
    expect((await m.act({ to_user_id: m.h.user })).body.error.fields).toEqual({ to_user_id: 'self' });
  });

  it('happy: mã 6 số tới email Owner, kết quả chỉ có địa chỉ đã che', async () => {
    const r = await m.act({ to_user_id: lan.id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.sent_to).toMatch(/^.{2}•••@/);
    const owner = await m.h.platform.user.findUniqueOrThrow({ where: { id: m.h.user } });
    expect(m.h.mail.last(owner.email)?.html).toMatch(/<b>\d{6}<\/b>/);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
