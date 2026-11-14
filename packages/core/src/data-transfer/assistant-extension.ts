// Mở rộng tệp đính kèm Trợ lý (TIP-038b P3, registry 023c 8c): tệp CSV / XLSX đính kèm trong lượt được gắn handler `data.import` — model
// biết có thể xem mẫu (`transfer.sample`, đã che) rồi lập kế hoạch nhập (`transfer.plan`). Registry KHÔNG import domain; domain tự đăng ký
// một lần khi module nạp (API + worker ROLE=ai).
import {
  registerAttachmentExtension,
  type AttachmentExtension,
} from '../ai/assistant/genui/extension-registry';

export const DATA_IMPORT_EXTENSION: AttachmentExtension = {
  key: 'data.import',
  mimes: [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  // Vào dòng ngữ cảnh tệp: model đi đúng đường nhập dùng chung (mọi thực thể), không gọi thẳng contact.import / delegate.
  hint: 'import ANY entity (contact = khách hàng, product = sản phẩm / dịch vụ, quote = báo giá, order = đơn hàng, contract = hợp đồng, invoice = đề nghị thanh toán / payment request; ticket_category_suggestions = danh mục gợi ý ticket (columns position?, label — REPLACES the whole suggestion list in one confirmation; any invalid row blocks the whole file, never drop or truncate rows; export it with ticket_categories.export); CRM activities under entity contact with dataset contact_notes = ghi chú / bình luận, contact_tasks = việc chăm sóc, contact_opportunities = cơ hội) from this file — package balances (liệu trình: total / used sessions) are EXPORT ONLY: never import them from a file (explain it is not supported; adjusting sessions is package.adjust_sessions with approval, export is package.export), via call_action transfer.sample {entity,dataset?,file_id} → transfer.plan {entity,dataset?,file_id,mapping} → transfer.commit {plan_id,if_version}; never contact.import / product.import / contact.add_note per row directly',
};

export const registerDataImportExtension = () => registerAttachmentExtension(DATA_IMPORT_EXTENSION);
