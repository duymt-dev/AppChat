// Ma trận contract.terminate (TIP-023b): chấm dứt (risk money) → trạng thái + lý do; chưa ký → 409 ở preview.
// 403 sales (không có contract.sign) · id lạ 404. Undo: ActionDef không khai.
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
  m = await matrix('contract.terminate');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
}, 120_000);
afterAll(() => m?.close());

describe('contract.terminate', () => {
  it('nháp → preview 409', async () => {
    expect((await m.act({ contract_id: C(), reason: 'x' }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ contract_id: C(), reason: 'x' }, m.sales)).status).toBe(403);
    expect((await m.act({ ...{ contract_id: C(), reason: 'x' }, contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
  // Đã ký cần PDF cuối (contract_signed_chk) — dựng tệp giả; luồng ký thật kiểm ở contracts.test.
  const f = await (await m.db()).file.create({ data: { id: '0190f000-0000-7000-8000-0000000f11e5', storageKey: `matrix/${C()}.pdf`, name: 'hd.pdf', mime: 'application/pdf', size: 1n, purpose: 'document', confirmed: true } });
    await setStatus('signed', { signedByBusinessAt: m.h.clock.now(), signedFileId: f.id, signedSha256: 'x'.repeat(64) });
    const { preview, done } = await m.confirm({ contract_id: C(), reason: ' Khách chuyển nơi ở ' });
    expect(preview).toEqual({ summary: `${c.code} · Liệu trình HIFU · Chị Lan HĐ · 18.000.000₫`, risk: 'money', changes: [{ entity: 'contract', id: C(), before: { status: 'signed', reason: null }, after: { status: 'terminated', reason: 'Khách chuyển nơi ở' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await row()).toMatchObject({ status: 'terminated', terminatedReason: 'Khách chuyển nơi ở' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
