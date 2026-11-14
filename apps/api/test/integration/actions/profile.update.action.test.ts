// Ma trận profile.update (TIP-023b): hồ sơ cá nhân (permission self) → trước / sau chỉ trường đổi của CHÍNH người gọi. Quyền 'self' — sales
// gọi được, chỉ đổi hồ sơ mình. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const user = (id: string) => m.h.platform.user.findUniqueOrThrow({ where: { id } });

beforeAll(async () => {
  m = await matrix('profile.update');
}, 120_000);
afterAll(() => m?.close());

describe('profile.update', () => {
  it('sales (self) chỉ đổi hồ sơ mình', async () => {
    expect((await m.act({ phone: '0909111222' }, m.sales)).status).toBe(200);
    expect([(await user(m.sales.id)).phone, (await user(m.h.user)).phone]).toEqual(['0909111222', null]);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ name: 'Chủ Spa', locale: 'en' });
    expect(preview).toEqual({ summary: 'Chủ Spa', risk: 'write', changes: [{ entity: 'user', id: m.h.user, before: { name: 'Owner', locale: 'vi' }, after: { name: 'Chủ Spa', locale: 'en' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await user(m.h.user)).locale).toBe('en');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
