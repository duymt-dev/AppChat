// Ma trận assistant.discovery_prepare (TIP-023e §1.4): thao tác hạ tầng chỉ chạy trong lượt Trợ lý Cowork có run tin cậy — gọi thẳng
// (UI / API, không run) → 403 cowork_only, không tạo generation; thiếu assistant.use → 403; preview mô tả kho sẽ dựng (không ghi gì).
// Undo / hàng loạt không áp dụng (noUndo — corpus là dữ liệu dẫn xuất, dựng lại được).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('assistant.discovery_prepare');
}, 120_000);
afterAll(() => m?.close());

describe('assistant.discovery_prepare', () => {
  it('gọi thẳng không có run Trợ lý → 403 cowork_only, không tạo generation', async () => {
    const r = await m.act({});
    expect(r.status).toBe(403);
    expect(r.body.error.fields).toMatchObject({ source: 'cowork_only' });
    expect(await (await m.db()).actionDiscoveryGeneration.count()).toBe(0);
  });

  it('source assistant nhưng không có run → preview vẫn chỉ đọc; xác nhận bị từ chối (không có run gốc tin cậy)', async () => {
    const pv = await m.act({}, undefined, { 'x-action-source': 'assistant' });
    expect([202, 403]).toContain(pv.status);
    expect(await (await m.db()).actionDiscoveryGeneration.count()).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
