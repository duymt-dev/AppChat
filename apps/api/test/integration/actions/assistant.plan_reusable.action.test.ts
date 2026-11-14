// Ma trận assistant.plan_reusable (TIP-023d §4.1): danh sách cấu trúc tái dùng của chính mình (chưa có ứng viên → rỗng); limit ngoài
// khoảng → 422. Đọc thuần.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('assistant.plan_reusable');
}, 120_000);
afterAll(() => m?.close());

describe('assistant.plan_reusable', () => {
  it('chưa có ứng viên → rỗng; limit sai → 422', async () => {
    const r = await m.act({ limit: 3 });
    expect(r.status).toBe(200);
    expect(r.body.data.result).toEqual({ candidates: [] });
    expect((await m.act({ limit: 0 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
