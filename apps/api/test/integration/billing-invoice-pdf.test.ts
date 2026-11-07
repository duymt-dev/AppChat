// TIP-039 pha 3 (AC08) trên Postgres + LibreOffice thật — PDF đề nghị thanh toán `GET /v1/billing/invoices/:id/pdf`:
//   - Owner tải: application/pdf, attachment, private no-store, nosniff; chữ trong PDF có mã, số tiền + thông tin xuất hoá đơn ĐÚNG ảnh
//     chụp lúc tạo (đổi hồ sơ doanh nghiệp sau đó không đổi PDF), dòng "không thay thế hoá đơn GTGT"; tiếng Anh theo locale người xem.
//   - Hoá đơn của workspace khác / id lạ → 404 (không lộ có tồn tại); Sales (không billing.manage) → 403.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pdfParse from 'pdf-parse';
import { uuidv7 } from '@appchat/core';
import { call, startApi, type Harness } from './setup';

let a: Harness;
let b: Harness;
let inv: string;
const textOf = async (r: Response) => (await pdfParse(Buffer.from(await r.arrayBuffer()))).text.replace(/\s+/g, ' ');

beforeAll(async () => {
  a = await startApi();
  b = await startApi();
  await a.platform.businessProfile.create({
    data: { workspaceId: a.ws, kind: 'enterprise', taxCode: '0312345678', legalName: 'Spa Hương Sen', address: '81 CMT8', businessDescription: 'Spa', declaredAt: a.clock.now() },
  });
  const r = await call(a, '/actions/billing.create_invoice', { input: { kind: 'credit', item: 'credit_1000' } }, { 'idempotency-key': uuidv7() });
  const body = (await r.json()) as { data: { result: { invoice_id: string } } };
  expect(r.status, JSON.stringify(body)).toBe(200);
  inv = body.data.result.invoice_id;
}, 240_000);
afterAll(async () => {
  await a?.platform.billingInvoice.deleteMany({ where: { workspaceId: a.ws } });
  await a?.close();
  await b?.close();
});

describe('PDF đề nghị thanh toán', () => {
  it('Owner tải: header riêng tư; số tiền + thông tin xuất HĐ theo ảnh chụp; có dòng không thay thế HĐ GTGT', async () => {
    const row = await a.platform.billingInvoice.findUniqueOrThrow({ where: { id: inv } });
    // Đổi hồ sơ sau khi tạo hoá đơn — PDF vẫn theo vat_info đã chụp.
    await a.platform.businessProfile.update({ where: { workspaceId: a.ws }, data: { legalName: 'Tên Mới Sau Này' } });
    const r = await call(a, `/billing/invoices/${inv}/pdf`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/pdf');
    expect(r.headers.get('content-disposition')).toBe(`attachment; filename*=UTF-8''${row.code}.pdf`);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    const t = await textOf(r);
    expect(t).toContain('Đề nghị thanh toán');
    expect(t).toContain(row.code);
    expect(t).toContain(row.transferCode);
    expect(t).toContain(`${new Intl.NumberFormat('vi-VN').format(Number(row.amount))}₫`);
    expect(t).toContain('Spa Hương Sen');
    expect(t).toContain('0312345678');
    expect(t).not.toContain('Tên Mới Sau Này');
    expect(t).toContain('không thay thế hoá đơn giá trị gia tăng');
  }, 120_000);

  it('locale en → chữ tiếng Anh, vẫn có dòng not-VAT', async () => {
    await a.platform.user.update({ where: { id: a.user }, data: { locale: 'en' } });
    try {
      const t = await textOf(await call(a, `/billing/invoices/${inv}/pdf`));
      expect(t).toContain('Payment request');
      expect(t).toContain('does not replace a VAT invoice');
    } finally {
      await a.platform.user.update({ where: { id: a.user }, data: { locale: 'vi' } });
    }
  }, 120_000);

  it('workspace khác / id lạ / id sai dạng → 404; Sales → 403', async () => {
    for (const id of [inv, uuidv7(), 'abc']) {
      const r = await call(b, `/billing/invoices/${id}/pdf`);
      expect([id, r.status, r.headers.get('content-type')]).toEqual([id, 404, expect.stringContaining('application/json')]);
    }
    const sales = await a.member('sales');
    const r = await call(a, `/billing/invoices/${inv}/pdf`, undefined, { authorization: `Bearer ${sales.token}` });
    expect(r.status).toBe(403);
  });
});
