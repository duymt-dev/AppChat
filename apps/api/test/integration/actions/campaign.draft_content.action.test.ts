// Ma trận campaign.draft_content (TIP-037, read, agent ✗, model giả AI_ENGINE=mock): viết lại theo giọng → chỉ trả đề xuất (không lưu chiến
// dịch / không gửi), một run consult + trừ Credit; nguồn assistant chạy ngay (read); sales / cs → 403; biến lạ → 422 trước khi gọi model.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const input = { text: 'Chào {ten}, spa có ưu đãi 20% tuần này', tone: 'formal', channel: 'zalo' };
const runs = async () => (await x.m.db()).aiRun.count({ where: { title: 'campaign.draft_content' } });

beforeAll(async () => {
  x = await mkMatrix('campaign.draft_content');
  await x.m.credit(1000);
}, 120_000);
afterAll(() => x?.close());

describe('campaign.draft_content', () => {
  it('happy (owner) + nguồn assistant chạy ngay: đề xuất văn bản, một run mỗi lần, không tạo chiến dịch', async () => {
    const r = await x.m.act(input);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.text.length).toBeGreaterThan(0);
    expect(await runs()).toBe(1);
    expect((await x.m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect(await runs()).toBe(2);
    expect(await (await x.m.db()).campaign.count()).toBe(0);
  });

  it('sales / cs 403; biến lạ → 422, không gọi model', async () => {
    expect((await x.m.act(input, x.m.sales)).status).toBe(403);
    expect((await x.m.act(input, x.m.cs)).status).toBe(403);
    const n = await runs();
    expect((await x.m.act({ ...input, text: 'Chào {so_du}' })).status).toBe(422);
    expect(await runs()).toBe(n);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'state')).toMatch(/risk read/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
