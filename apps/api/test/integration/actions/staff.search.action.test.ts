// Ma trận staff.search (TIP-023b R2): happy (tên / kỹ năng bỏ dấu, chỉ nhân sự đang làm, không lịch / liên hệ) · 403 (kế toán không có
// booking.view) · nguồn assistant · giới hạn 20. Scope: danh mục nhân sự là cấu hình, không có data scope — ai có booking.view thấy như màn
// Lịch hẹn. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let linh: string;

beforeAll(async () => {
  m = await matrix('staff.search');
  linh = (await m.seed('staff.create', { name: 'KTV. Thuỳ Linh', role: 'KTV da' })).staff_id;
  const off = (await m.seed('staff.create', { name: 'KTV. Linh Cũ' })).staff_id;
  await m.seed('staff.deactivate', { staff_id: off });
}, 120_000);
afterAll(() => m?.close());

describe('staff.search', () => {
  it('happy: bỏ dấu, chỉ nhân sự đang làm, không trả lịch', async () => {
    const r = await m.act({ q: 'linh' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.staff).toEqual([{ id: linh, name: 'KTV. Thuỳ Linh', role: 'KTV da', skills: [] }]);
  });

  it('403: kế toán; sales (booking.view) đọc được', async () => {
    expect((await m.act({}, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ q: 'linh' }, m.sales)).status).toBe(200);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
