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
  hint: 'transfer.sample → transfer.plan → transfer.commit',
};

export const registerDataImportExtension = () => registerAttachmentExtension(DATA_IMPORT_EXTENSION);
