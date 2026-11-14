// Ma trận run.cancel (TIP-023b): huỷ run + cây con (risk write) → số run chưa kết thúc sẽ huỷ; đã kết thúc → không đổi gì; run lạ → 404 ở
// preview. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { run } from '../helpers/ai-fixtures';

let m: Matrix;
let root: { id: string; root: string };

beforeAll(async () => {
  m = await matrix('run.cancel');
  root = await run(m, 'Báo cáo tuần');
  await run(m, 'Bước con', { parent: root });
  await run(m, 'Bước xong', { parent: root, status: 'completed' });
}, 120_000);
afterAll(() => m?.close());

describe('run.cancel', () => {
  it('run lạ → 404', async () => {
    expect((await m.act({ run_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; đã huỷ → không đổi gì', async () => {
    const { preview, done } = await m.confirm({ run_id: root.id });
    expect(preview).toEqual({ summary: 'Báo cáo tuần', risk: 'write', count: 2, changes: [{ entity: 'ai_run', id: root.id, before: { status: 'running' }, after: { status: 'cancelled' } }] });
    expect(done.body.data.result).toEqual({ run_id: root.id, status: 'cancelled' });
    expect((await m.confirm({ run_id: root.id })).preview).toEqual({ summary: 'Báo cáo tuần', risk: 'write', count: 0, changes: [] });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
