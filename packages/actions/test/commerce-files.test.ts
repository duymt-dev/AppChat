// TIP-032d §1.2–1.3: schema 6 action tệp đính kèm đơn / đề nghị — nguồn gắn chỉ hai dạng đóng (tệp tải cho đúng bản ghi | artifact Trợ lý
// có revision), không nhận URL / đường dẫn / storage key; gỡ cần if_version dương; danh sách tối đa 50 / trang; quyền + rủi ro + cấp cho agent
// đúng thiết kế; kết quả không có trường link tải.
import { describe, expect, it } from 'vitest';
import { getAction, invoiceFileAttach, invoiceFileDetach, invoiceFilesList, orderFileAttach, orderFileDetach, orderFilesList } from '../src';

const ID = '0193a000-0000-7000-8000-000000000001';

describe('commerce file actions', () => {
  it('đăng ký đủ 6 action trong registry, quyền + rủi ro đúng', () => {
    const meta = (id: string) => {
      const d = getAction(id)!;
      return [d.permission, d.risk, d.agentGrantable, !!d.undo];
    };
    expect(meta('order.file_attach')).toEqual(['order.manage', 'write', true, false]);
    expect(meta('order.file_detach')).toEqual(['order.manage', 'delete', true, false]);
    expect(meta('order.files_list')).toEqual(['order.view', 'read', true, false]);
    expect(meta('invoice.file_attach')).toEqual(['invoice.manage', 'write', true, false]);
    expect(meta('invoice.file_detach')).toEqual(['invoice.manage', 'delete', true, false]);
    expect(meta('invoice.files_list')).toEqual(['invoice.manage', 'read', true, false]);
  });

  it('nguồn gắn: chỉ target_upload_handle | assistant_artifact_ref (có revision), không trường lạ / URL', () => {
    const ok = (source: unknown) => orderFileAttach.input.safeParse({ order_id: ID, source, if_revision: 0 }).success;
    expect(ok({ kind: 'target_upload_handle', file_id: ID })).toBe(true);
    expect(ok({ kind: 'assistant_artifact_ref', artifact_id: ID, revision: 2 })).toBe(true);
    expect(ok({ kind: 'assistant_artifact_ref', artifact_id: ID })).toBe(false);
    expect(ok({ kind: 'target_upload_handle', file_id: ID, url: 'https://x' })).toBe(false);
    expect(ok({ kind: 'url', url: 'https://x/a.pdf' })).toBe(false);
    expect(ok({ kind: 'storage_key', key: 'ws/a.pdf' })).toBe(false);
    expect(invoiceFileAttach.input.safeParse({ invoice_id: ID, source: { kind: 'target_upload_handle', file_id: ID } }).success).toBe(false);
  });

  it('gỡ cần if_version ≥ 1; danh sách limit 1..50', () => {
    expect(orderFileDetach.input.safeParse({ order_id: ID, attachment_id: ID, if_version: 0 }).success).toBe(false);
    expect(invoiceFileDetach.input.safeParse({ invoice_id: ID, attachment_id: ID, if_version: 1 }).success).toBe(true);
    expect(orderFilesList.input.safeParse({ order_id: ID, limit: 51 }).success).toBe(false);
    expect(invoiceFilesList.input.safeParse({ invoice_id: ID, limit: 50, cursor: 'abc' }).success).toBe(true);
  });

  it('kết quả danh sách: không có trường URL / storage; chứng từ đã sinh kind riêng, không gỡ', () => {
    const row = { attachment_id: null, file_id: ID, name: 'DN.pdf', mime: 'application/pdf', bytes: 10, created_at: '2026-11-12T00:00:00.000Z', created_by: null, created_by_name: '', kind: 'generated_invoice', version: null, available: true, can_detach: false };
    const parsed = invoiceFilesList.output.parse({ files: [{ ...row, url: 'https://leak' }], revision: 0, can_attach: true, next_cursor: null });
    expect(Object.keys(parsed.files[0]!)).not.toContain('url');
    expect(JSON.stringify(orderFilesList.output.shape)).not.toMatch(/storage|url/i);
  });

  it('mô tả hướng model: không đổi tiền / trạng thái, if_revision / if_version, không link tải', () => {
    expect(orderFileAttach.description).toMatch(/never changes money/);
    expect(orderFileAttach.description).toMatch(/if_revision/);
    expect(orderFileDetach.description).toMatch(/if_version/);
    expect(orderFilesList.description).toMatch(/No download links/);
  });
});
