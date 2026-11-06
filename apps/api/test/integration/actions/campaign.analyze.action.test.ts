// Ma trận campaign.analyze (TIP-037, write, agent ✗): chỉ ghi yêu cầu (run queued + event campaign.analysis_requested), không gọi model trong
// request; preview Trợ lý → xác nhận; bấm lại khi còn chờ → cùng run; sales / cs → 403; idempotency cùng khoá → một event. Worker chạy
// model + lưu gợi ý + Credit: marketing-analytics.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const requests = async () => (await x.m.db()).outboxEvent.count({ where: { topic: 'campaign.analysis_requested' } });

beforeAll(async () => {
  x = await mkMatrix('campaign.analyze');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.analyze', () => {
  it('preview Trợ lý → xác nhận → queued, một event; bấm lại khi còn chờ → cùng run; không gọi model', async () => {
    const { preview, done } = await x.m.confirm({});
    expect(preview.risk).toBe('write');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.status).toBe('queued');
    expect((await x.m.act({})).body.data.result.run_id).toBe(done.body.data.result.run_id);
    expect(await requests()).toBe(1);
    expect(await (await x.m.db()).aiRun.count()).toBe(0);
  });

  it('sales / cs 403; idempotency cùng khoá → không thêm event', async () => {
    expect((await x.m.act({}, x.m.sales)).status).toBe(403);
    expect((await x.m.act({}, x.m.cs)).status).toBe(403);
    await (await x.m.db()).outboxEvent.updateMany({ where: { topic: 'campaign.analysis_requested' }, data: { status: 'published' } });
    const n = await requests();
    const a = await x.m.actWithKey('cmp-an-key', {});
    const b = await x.m.actWithKey('cmp-an-key', {});
    expect(b.body.data.result.run_id).toBe(a.body.data.result.run_id);
    expect(await requests()).toBe(n + 1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
