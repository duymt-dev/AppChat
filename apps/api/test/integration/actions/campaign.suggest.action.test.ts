// Ma trận campaign.suggest (TIP-037, read · skill · agentGrantable): đọc gợi ý AI đã lưu (status new — không gọi model, không trừ Credit);
// nguồn assistant chạy ngay; sales / cs (không campaign.view) → 403. Sinh gợi ý: campaign.analyze + marketing-analytics.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const ids = [uuidv7(), uuidv7()];

beforeAll(async () => {
  x = await mkMatrix('campaign.suggest');
  const db = await x.m.db();
  const base = { kind: 'reactivation', reason: 'r', segmentFilter: { field: 'group', op: 'in', value: ['vip'] }, body: 'Chào {ten}' };
  await db.campaignSuggestion.create({ data: { id: ids[0]!, title: 'Khách lâu chưa quay lại', estCount: 4, ...base } });
  await db.campaignSuggestion.create({ data: { id: ids[1]!, title: 'Đã dùng', status: 'used', ...base } });
}, 120_000);
afterAll(() => x?.close());

describe('campaign.suggest', () => {
  it('happy (owner): chỉ gợi ý mới; nguồn assistant chạy ngay; không tạo run AI', async () => {
    const r = await x.m.act({});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.suggestions).toEqual([{ id: ids[0], title: 'Khách lâu chưa quay lại', est_count: 4 }]);
    expect((await x.m.act({}, undefined, { 'x-action-source': 'assistant' })).body.data.result.suggestions).toHaveLength(1);
    expect(await (await x.m.db()).aiRun.count()).toBe(0);
  });

  it('sales / cs 403', async () => {
    expect((await x.m.act({}, x.m.sales)).status).toBe(403);
    expect((await x.m.act({}, x.m.cs)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'state')).toMatch(/risk read/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
