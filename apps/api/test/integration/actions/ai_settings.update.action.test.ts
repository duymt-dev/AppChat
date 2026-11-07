// Ma trận ai_settings.update (TIP-023b): cài đặt Mô hình AI (risk config) → trước / sau chỉ phần đổi; tác vụ lạ → 422, mức vượt gói → 402 ở
// preview. 403 sales (không có ai.governance). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('ai_settings.update');
}, 120_000);
afterAll(() => m?.close());

describe('ai_settings.update', () => {
  it('403 sales · tác vụ lạ → 422 · mức vượt gói → 402', async () => {
    expect((await m.act({ budget: 1 }, m.sales)).status).toBe(403);
    expect((await m.act({ tasks: { nope: 'standard' } }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
    expect((await m.act({ default_tier: 'max' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(402);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ budget: 5000, tasks: { insights: 'standard' } });
    expect(preview).toEqual({ summary: 'standard', risk: 'config', changes: [{ entity: 'ai_setting', id: '1', before: { budget: 0, tasks: { insights: null } }, after: { budget: 5000, tasks: { insights: 'standard' } } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
