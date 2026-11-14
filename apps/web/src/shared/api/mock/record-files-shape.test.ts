// TIP-032d (mock ↔ BE): `order|invoice.files_list` trả đúng output schema của action; tải `record_attachment` cần đích + quyền ghi; gắn đúng
// đích / revision (409 STALE, 409 other_target), gửi lại → reused; gỡ CAS version; chứng từ đã sinh không gỡ được; sales own đơn người
// khác → 404; đuôi ngoài danh sách → 415.
import { beforeEach, describe, expect, it } from 'vitest';
import { invoiceFilesList, orderFilesList } from '@appchat/actions';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createOrdersState } from './domains/orders';
import { createInvoicesState } from './domains/invoices';

const ORDER = 'ord_290411';
const INVOICE = 'inv_2039';
const pdf = (name = 'a.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' });
const list = async (t: 'order' | 'invoice', id: string) => ((await mockTransport.action(`${t}.files_list`, { [`${t}_id`]: id })) as { data: { result: Record<string, unknown> } }).data.result;
const err = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return null;
  } catch (e) {
    const x = e as { status?: number; error?: { code: string; fields?: Record<string, string> } };
    return { status: x.status, code: x.error?.code, fields: x.error?.fields };
  }
};
const up = (t: 'order' | 'invoice', id: string, name = 'a.pdf') => mockTransport.upload(pdf(name), 'record_attachment', undefined, { parent_type: t, parent_id: id });
const attach = (t: 'order' | 'invoice', id: string, fileId: string, rev: number) => mockTransport.action(`${t}.file_attach`, { [`${t}_id`]: id, source: { kind: 'target_upload_handle', file_id: fileId }, if_revision: rev });

describe('mock tệp đính kèm đơn / đề nghị', () => {
  beforeEach(() => {
    mockDb().orders = createOrdersState();
    mockDb().invoices = createInvoicesState();
    setMockRole('owner');
  });

  it('files_list khớp output schema; đề nghị có chứng từ đã sinh không gỡ được', async () => {
    expect(orderFilesList.output.safeParse(await list('order', ORDER)).success).toBe(true);
    const inv = await list('invoice', INVOICE);
    expect(invoiceFilesList.output.safeParse(inv).success).toBe(true);
    const files = inv.files as { kind: string; can_detach: boolean; attachment_id: string | null }[];
    expect(files.find((f) => f.kind === 'generated_invoice')).toMatchObject({ can_detach: false, attachment_id: null });
  });

  it('tải kèm đích → gắn → reused khi gửi lại; revision lệch → 409; staging của đơn khác → other_target', async () => {
    const rev = (await list('order', ORDER)).revision as number;
    const f = await up('order', ORDER, 'phu-luc.pdf');
    const a = (await attach('order', ORDER, f.file_id, rev)) as { data: { result: { revision: number; reused: boolean } } };
    expect(a.data.result).toMatchObject({ revision: rev + 1, reused: false });
    expect(((await attach('order', ORDER, f.file_id, rev)) as { data: { result: { reused: boolean } } }).data.result.reused).toBe(true);
    const g = await up('order', ORDER, 'cu.pdf');
    expect(await err(() => attach('order', ORDER, g.file_id, rev))).toMatchObject({ status: 409, code: 'STALE_VERSION' });
    expect(await err(() => attach('order', 'ord_290410', g.file_id, 0))).toMatchObject({ status: 409, fields: { file_id: 'other_target' } });
  });

  it('gỡ CAS version; lần hai → 409 detached', async () => {
    const rev = (await list('order', ORDER)).revision as number;
    const f = await up('order', ORDER);
    const a = (await attach('order', ORDER, f.file_id, rev)) as { data: { result: { attachment_id: string } } };
    const id = a.data.result.attachment_id;
    await mockTransport.action('order.file_detach', { order_id: ORDER, attachment_id: id, if_version: 1 });
    expect(await err(() => mockTransport.action('order.file_detach', { order_id: ORDER, attachment_id: id, if_version: 2 }))).toMatchObject({ status: 409, fields: { attachment_id: 'detached' } });
  });

  it('tải lên: thiếu đích → 422; đuôi ngoài danh sách → 415; sales own đơn người khác → 404', async () => {
    expect(await err(() => mockTransport.upload(pdf(), 'record_attachment'))).toMatchObject({ status: 422, fields: { parent: 'required' } });
    expect(await err(() => up('order', ORDER, 'a.html'))).toMatchObject({ status: 415 });
    setMockRole('sales');
    expect(await err(() => up('order', ORDER))).toMatchObject({ status: 404 });
  });
});
