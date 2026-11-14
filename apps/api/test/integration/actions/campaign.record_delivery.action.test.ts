// Ma trận campaign.record_delivery (TIP-037, system-only — worker gửi ROLE=channels): HTTP 403 / header system 422, ẩn khỏi Trợ lý. Nguồn
// system đúng actor: accepted → sent + khoá 48 giờ; kết quả sau đó không ghi đè kết quả cuối; actor khác → 403. Đua kết quả trùng /
// unknown: marketing-concurrency.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { na } from '../helpers/action-matrix';
import { expectSystemOnly, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;

beforeAll(async () => {
  x = await mkMatrix('campaign.record_delivery');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.record_delivery', () => {
  it('system-only: HTTP 403 / header system 422; ẩn khỏi Trợ lý', async () => {
    await expectSystemOnly(x.m, { delivery_ref: `cr_${uuidv7()}`, outcome: 'accepted', definite: true });
  });

  it('nguồn system: accepted → sent + khoá 48 giờ; failed sau accepted không đổi; actor khác → 403', async () => {
    const k = await x.mk.contact({ zaloAccount: x.zalo });
    const { id } = await x.mk.campaign({ contacts: [k], account: x.zalo, approve: true });
    x.m.h.clock.advance(60_000);
    await x.mk.tick();
    const r = (await x.mk.recipients(id))[0]!;
    await expect(x.mk.system('dispatch', 'campaign.record_delivery', { delivery_ref: `cr_${r.id}`, outcome: 'accepted', definite: true })).rejects.toMatchObject({ httpStatus: 403 });
    await x.mk.deliver(r.id, 'accepted');
    await x.mk.deliver(r.id, 'failed');
    expect((await x.mk.recipients(id))[0]).toMatchObject({ status: 'sent', outcome: 'accepted', sendState: 'confirmed' });
    expect(await (await x.m.db()).campaignContactTouch.count({ where: { contactId: k } })).toBe(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
