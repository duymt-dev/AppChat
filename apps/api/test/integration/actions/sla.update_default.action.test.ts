// Ma trận sla.update_default (TIP-023b): preview Trợ lý (tên chính sách + mục tiêu trước / sau) → xác nhận · 403 (sales không có sla.manage).
// Scope: cấu hình workspace. Undo: ActionDef không khai (đổi chỉ áp ticket tạo sau) → 409 UNDO_NOT_SUPPORTED. Gọi lặp cùng giá trị cùng kết quả.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let before: number;

beforeAll(async () => {
  m = await matrix('sla.update_default');
  // Chính sách mặc định có sẵn (ticket đầu tiên seed) — preview so với giá trị thật.
  await m.seed('ticket.create', { title: 'Khởi tạo SLA', channel: 'email', category: 'Khác', priority: 'low' });
  before = (await (await m.db()).slaPolicy.findFirstOrThrow({ where: { isDefault: true } })).frtHumanMin;
}, 120_000);
afterAll(() => m?.close());

describe('sla.update_default', () => {
  it('preview Trợ lý → xác nhận; undo không hỗ trợ', async () => {
    const { preview, done } = await m.confirm({ frt_human: before + 5 });
    expect(preview).toMatchObject({ risk: 'config', changes: [{ entity: 'sla_policy', before: { frt_human: before }, after: { frt_human: before + 5 } }] });
    expect(preview.summary).not.toBe('');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const db = await m.db();
    expect((await db.slaPolicy.findFirstOrThrow({ where: { isDefault: true } })).frtHumanMin).toBe(before + 5);
    expect((await m.undo(done.body.data.action_log_id)).body.error.code).toBe('UNDO_NOT_SUPPORTED');
  });

  it('403 sales · gọi lặp cùng giá trị', async () => {
    expect((await m.act({ frt_human: 30 }, m.sales)).status).toBe(403);
    const a = await m.act({ ttr_human: 600 });
    expect((await m.act({ ttr_human: 600 })).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
