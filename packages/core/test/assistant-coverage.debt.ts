// Nợ preview của TIP-023b R1.3 (tách khỏi assistant-coverage.test.ts cho gọn): action ghi có handler thật nhưng chưa có `preview()`
// — thẻ xác nhận chỉ hiện câu chung. R2 trả dần; xong R2 danh sách này rỗng. Chỉ được xoá dòng, không thêm.
export const PREVIEW_DEBT: ReadonlySet<string> = new Set([
  'admin.invoice.confirm_transfer',
  'billing.cancel_invoice', 'billing.create_invoice', 'billing.report_transfer',
  'contact.send_email',
  'doc_template.update',
  'governance.update',
  'integration.connect', 'integration.disconnect', 'integration.register_interest',
  'kb.add_source', 'kb.folder.create', 'kb.refresh_source', 'kb.remove_source', 'kb.update_source',
]);
