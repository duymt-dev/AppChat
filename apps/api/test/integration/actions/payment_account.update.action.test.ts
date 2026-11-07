// Ma trận payment_account.update (TIP-023b): tài khoản nhận tiền (risk config) → ngân hàng / BIN / số TK / chủ TK trước / sau (nguồn VietQR).
// 403 sales (không có finance.manage). Cấu hình workspace — không id. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('payment_account.update');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
}, 120_000);
afterAll(() => m?.close());

describe('payment_account.update', () => {
  const inp = { bank: 'Vietcombank', bank_bin: '970436', account_no: '0071000123456', account_name: 'cong ty an nhien' };

  it('403 sales', async () => {
    expect((await m.act(inp, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm(inp);
    expect(preview).toEqual({
      summary: 'Vietcombank · 0071000123456',
      risk: 'config',
      changes: [{ entity: 'payment_account', id: '1', before: { bank: null, bank_bin: null, account_no: null, account_name: null }, after: { bank: 'Vietcombank', bank_bin: '970436', account_no: '0071000123456', account_name: 'CONG TY AN NHIEN' } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).paymentAccount.findUniqueOrThrow({ where: { id: 1 } })).accountName).toBe('CONG TY AN NHIEN');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
