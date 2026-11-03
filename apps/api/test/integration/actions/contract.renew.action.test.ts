// Ma trận contract.renew (TIP-023b): gia hạn = hợp đồng mới (bắt đầu từ ngày kết thúc cũ) → khách + người làm + tiêu đề + giá trị + mã gốc;
// chưa ký → 409 ở preview; undo xoá mềm bản mới. 403 cs · sales own → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { contract_id: string; code: string };
let lan: string;
const C = () => c.contract_id;
/** Dựng trạng thái ở DB (Duyệt & ký cần OTP + LibreOffice — đã kiểm ở contract.approve_and_sign / contracts.test). */
const setStatus = async (status: string, data: Record<string, unknown> = {}) => (await m.db()).contract.update({ where: { id: C() }, data: { status: status as never, ...data } });

beforeAll(async () => {
  m = await matrix('contract.renew');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
}, 120_000);
afterAll(() => m?.close());

describe('contract.renew', () => {
  it('nháp → preview 409', async () => {
    expect((await m.act({ contract_id: C() }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ contract_id: C() }, m.cs)).status).toBe(403);
    expect((await m.act({ contract_id: C() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ contract_id: C() }, contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
  // Đã ký cần PDF cuối (contract_signed_chk) — dựng tệp giả; luồng ký thật kiểm ở contracts.test.
  const f = await (await m.db()).file.create({ data: { id: '0190f000-0000-7000-8000-0000000f11e5', storageKey: `matrix/${C()}.pdf`, name: 'hd.pdf', mime: 'application/pdf', size: 1n, purpose: 'document', confirmed: true } });
    await setStatus('signed', { signedByBusinessAt: m.h.clock.now(), signedFileId: f.id, signedSha256: 'x'.repeat(64) });
    const { preview, done } = await m.confirm({ contract_id: C() });
    expect(preview).toEqual({ summary: 'Chị Lan HĐ · Liệu trình HIFU · 18.000.000₫', risk: 'write', changes: [{ entity: 'contract', after: { contact: 'Chị Lan HĐ', owner: 'Chủ Spa', kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2027-04-30', renewal_of: c.code } }] });
    const id = done.body.data.result.contract_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contract.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
