// Ma trận campaign.dispatch (TIP-037, system-only — scheduler ROLE=jobs): HTTP ui / assistant → 403 kể cả Owner, header system → 422, ẩn
// khỏi Trợ lý / agent. Nguồn system đúng actor: nhận lô người nhận của chiến dịch đã duyệt (approved → running); sai approved_version → 409;
// actor hệ thống khác → 403. Đua nhiều lượt / khoá 48 giờ / trần chủ động: marketing-concurrency.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { na } from '../helpers/action-matrix';
import { expectSystemOnly, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
type Out = { data: { result: { claimed: number } } };

beforeAll(async () => {
  x = await mkMatrix('campaign.dispatch');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.dispatch', () => {
  it('system-only: HTTP 403 / header system 422; ẩn khỏi Trợ lý', async () => {
    await expectSystemOnly(x.m, { campaign_id: uuidv7(), approved_version: 1, batch: 0 });
  });

  it('nguồn system (scheduler): nhận lô → running; lệch approved_version → 409; actor hệ thống khác → 403', async () => {
    const k = await x.mk.contact({ zaloAccount: x.zalo });
    const { id, version } = await x.mk.campaign({ contacts: [k], account: x.zalo, approve: true });
    await expect(x.mk.system('dispatch', 'campaign.dispatch', { campaign_id: id, approved_version: version + 1, batch: 0 })).rejects.toMatchObject({ httpStatus: 409 });
    await expect(x.mk.system('delivery', 'campaign.dispatch', { campaign_id: id, approved_version: version, batch: 0 })).rejects.toMatchObject({ httpStatus: 403 });
    const r = (await x.mk.system('dispatch', 'campaign.dispatch', { campaign_id: id, approved_version: version, batch: 0 })) as Out;
    expect(r.data.result.claimed).toBe(1);
    expect((await (await x.m.db()).campaign.findUniqueOrThrow({ where: { id } })).status).toBe('running');
    // Lượt sau: người nhận đã nhận lô không bị nhận lần hai.
    const again = (await x.mk.system('dispatch', 'campaign.dispatch', { campaign_id: id, approved_version: version, batch: 1 })) as Out;
    expect(again.data.result.claimed).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
