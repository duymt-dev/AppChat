// Ma trận campaign.recipient_export (TIP-037, read): CSV người nhận trong scope người xuất, tệp đính kèm có đăng nhập; nguồn assistant chạy
// ngay (read); sales / cs (không campaign.view) → 403; chiến dịch lạ → 404. Ô công thức / scope / tải tệp: marketing-contract.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { na } from '../helpers/action-matrix';
import { mkMatrix, sentCampaign, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
let id: string;

beforeAll(async () => {
  x = await mkMatrix('campaign.recipient_export');
  id = await sentCampaign(x);
}, 120_000);
afterAll(() => x?.close());

describe('campaign.recipient_export', () => {
  it('happy (owner) + nguồn assistant chạy ngay: một dòng người nhận, tệp attachment', async () => {
    const r = await x.m.act({ campaign_id: id, status: 'sent' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.rows).toBe(1);
    expect((await (await x.m.db()).file.findUniqueOrThrow({ where: { id: r.body.data.result.file_id } })).purpose).toBe('attachment');
    expect((await x.m.act({ campaign_id: id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('sales / cs 403; chiến dịch lạ → 404', async () => {
    expect((await x.m.act({ campaign_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ campaign_id: id }, x.m.cs)).status).toBe(403);
    expect((await x.m.act({ campaign_id: uuidv7() })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'state')).toMatch(/risk read/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
