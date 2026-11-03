// Ma trận tag.update (TIP-023b): happy · preview Trợ lý (trước / sau chỉ trường đổi) · 403 (sales) · id lạ → 404 · trùng tên → 409.
// Scope: cấu hình workspace, không data scope. Undo: không khai; trạng thái: không có. Idempotency: ghi đè giá trị — gọi lặp cùng kết quả.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let vip: string;

beforeAll(async () => {
  m = await matrix('tag.update');
  vip = (await m.seed('tag.create', { name: 'VIP', color: '#DC2626' })).tag_id;
  await m.seed('tag.create', { name: 'Khiếu nại' });
}, 120_000);
afterAll(() => m?.close());

describe('tag.update', () => {
  it('preview Trợ lý: trước / sau chỉ trường đổi; xác nhận → lưu', async () => {
    const { preview, done } = await m.confirm({ tag_id: vip, name: 'Khách VIP', color: '#DC2626' });
    expect(preview).toEqual({ summary: 'VIP → Khách VIP', risk: 'config', changes: [{ entity: 'tag', id: vip, before: { name: 'VIP' }, after: { name: 'Khách VIP' } }] });
    expect(done.status).toBe(200);
    expect(await (await m.db()).tag.findUnique({ where: { id: vip } })).toMatchObject({ name: 'Khách VIP' });
  });

  it('403 sales · id lạ → 404 · trùng tên → 409', async () => {
    expect((await m.act({ tag_id: vip, name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ tag_id: '0190f000-0000-7000-8000-00000000beef', name: 'X' })).status).toBe(404);
    expect((await m.act({ tag_id: vip, name: 'khieu nai' })).status).toBe(409);
  });

  it('idempotency: gọi lặp cùng giá trị → cùng kết quả', async () => {
    const a = await m.act({ tag_id: vip, emoji: '⭐' });
    const b = await m.act({ tag_id: vip, emoji: '⭐' });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(b.body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
