// Ma trận campaign.unsubscribe (TIP-037, system-only — trang công khai /v1/public/campaign-unsubscribe/:token): HTTP action ui / assistant →
// 403 kể cả Owner, header system → 422, ẩn khỏi Trợ lý. Đường công khai: token ký → opt-out, người nhận chưa gửi bị loại; token sửa → 404;
// xác nhận lại không đổi. Trang + GET chỉ đọc: marketing.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseEncKey, unsubToken } from '@appchat/core';
import { na } from '../helpers/action-matrix';
import { json } from '../helpers/marketing-fixtures';
import { expectSystemOnly, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';
import { env } from '../setup';

let x: MkMatrix;

beforeAll(async () => {
  x = await mkMatrix('campaign.unsubscribe');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.unsubscribe', () => {
  it('system-only: HTTP action 403 / header system 422; ẩn khỏi Trợ lý', async () => {
    await expectSystemOnly(x.m, { token: 'x'.repeat(40) });
  });

  it('đường công khai: token ký → opt-out + loại người nhận chưa gửi; xác nhận lại idempotent; token sửa → 404', async () => {
    const k = await x.mk.contact({ zaloAccount: x.zalo });
    const { id } = await x.mk.campaign({ contacts: [k], account: x.zalo, approve: true });
    const r = (await x.mk.recipients(id))[0]!;
    const t = unsubToken(parseEncKey(env.APP_ENC_KEY!), x.m.h.ws, r.id, x.m.h.clock.now());
    const confirm = (tok: string) => fetch(`${x.m.h.base}/v1/public/campaign-unsubscribe/${tok}/confirm`, { method: 'POST' }).then(json);
    expect((await confirm(t.slice(0, -2) + 'xx')).status).toBe(404);
    expect((await confirm(t)).body.data.unsubscribed).toBe(true);
    expect((await confirm(t)).body.data.unsubscribed).toBe(true);
    expect((await (await x.m.db()).contact.findUniqueOrThrow({ where: { id: k } })).marketingOptOut).toBe(true);
    expect((await x.mk.recipients(id))[0]).toMatchObject({ status: 'skipped', skipReason: 'opt_out' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
