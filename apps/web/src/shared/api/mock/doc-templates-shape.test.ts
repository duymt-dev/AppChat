// TIP-028: route mock Mẫu chứng từ đúng shape dùng chung với API thật (packages/shared/src/api/documents.ts) + hành vi ghi như server.
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiRequestError, docTemplatesListSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const fail = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as ApiRequestError).error;
  }
  throw new Error('expected failure');
};

describe('mock doc-templates — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /doc-templates (+ ?kind=) khớp schema; bảng kiểm thiếu tính theo nội dung', async () => {
    const all = await mockTransport.get('/doc-templates');
    expect(issues(docTemplatesListSchema.safeParse(all))).toEqual([]);
    const q = docTemplatesListSchema.parse(await mockTransport.get('/doc-templates', { kind: 'quote' })).data;
    expect(q.map((x) => x.id)).toEqual(['tpl_q1', 'tpl_q2']);
    expect(q[0]!.checklist_missing).toEqual(['seller_tax', 'date', 'vat_note']);
  });

  it('biến lạ / vòng items không đóng → 422 như server; if_version lệch → 409; mặc định không xoá', async () => {
    expect(await fail(mockTransport.action('doc_template.create', { kind: 'quote', name: 'X', source: 'rich', body: '{{contract.value}}' }, { idempotencyKey: 'a' }))).toMatchObject({ fields: { body: 'unknown_vars:contract.value' } });
    expect(await fail(mockTransport.action('doc_template.create', { kind: 'quote', name: 'X', source: 'rich', body: '{{#items}}{{name}}' }, { idempotencyKey: 'b' }))).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(await fail(mockTransport.action('doc_template.update', { template_id: 'tpl_q1', name: 'Y', if_version: 1 }))).toMatchObject({ code: 'STALE_VERSION' });
    expect(await fail(mockTransport.action('doc_template.delete', { template_id: 'tpl_q1' }))).toMatchObject({ code: 'CONFLICT' });
  });

  it('xem trước: HTML điền dữ liệu minh hoạ; phiếu thu có dòng không thay thế HĐ GTGT', async () => {
    const html = await (await mockTransport.blob('/doc-templates/tpl_r1/preview')).text();
    expect(html).toContain('Công ty TNHH Khách Hàng Mẫu');
    expect(html).toContain('không thay thế hoá đơn giá trị gia tăng');
    expect(await fail(mockTransport.blob('/doc-templates/x/preview'))).toMatchObject({ code: 'NOT_FOUND' });
  });
});
