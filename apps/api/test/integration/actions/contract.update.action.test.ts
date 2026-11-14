// Ma trận contract.update (TIP-023b): sửa nháp → trước / sau chỉ trường đổi (người làm theo tên); ngoài nháp → 409 ở preview; undo trả
// giá trị cũ. 403 cs · sales own → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { contract_id: string; code: string };
let lan: string;
const C = () => c.contract_id;
const row = async () => (await m.db()).contract.findUniqueOrThrow({ where: { id: C() } });
/** Dựng trạng thái ở DB (Duyệt & ký cần OTP + LibreOffice — đã kiểm ở contract.approve_and_sign / contracts.test). */
const setStatus = async (status: string, data: Record<string, unknown> = {}) => (await m.db()).contract.update({ where: { id: C() }, data: { status: status as never, ...data } });

beforeAll(async () => {
  m = await matrix('contract.update');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
}, 120_000);
afterAll(() => m?.close());

describe('contract.update', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ contract_id: C(), patch: { note: 'x' } }, m.cs)).status).toBe(403);
    expect((await m.act({ contract_id: C(), patch: { note: 'x' } }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ contract_id: C(), patch: { note: 'x' } }, contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contract_id: C(), patch: { value: '20000000', note: 'Ưu đãi', end_date: '2027-04-30' } });
    expect(preview).toEqual({ summary: `${c.code} · Liệu trình HIFU`, risk: 'write', changes: [{ entity: 'contract', id: C(), before: { value: '18000000', note: '' }, after: { value: '20000000', note: 'Ưu đãi' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await row()).value).toBe(20000000n);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await row()).toMatchObject({ value: 18000000n, note: '' });
  });

  it('đã trình duyệt → preview 409 INVALID_TRANSITION', async () => {
    await setStatus('pending_approval');
    expect((await m.act({ contract_id: C(), patch: { note: 'y' } }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
