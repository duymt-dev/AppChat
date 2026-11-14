// Trường nhập 3 tập dữ liệu hoạt động CRM dưới thực thể khách (TIP-026b §5): ghi chú / bình luận, việc chăm sóc, cơ hội. Khách tra bằng
// mã khách / SĐT / email trong phạm vi GHI của người nhập (không tự tạo khách, không đoán khi trùng nhiều). Không có cột người phụ trách /
// tác giả / thời điểm tạo (không ghi đè audit); `id` chỉ để nhận ra dòng xuất từ hệ thống khi nhập lại (bị loại, không cập nhật ngầm).
// Trạng thái việc chỉ nhận `open` (việc nhập luôn mở). Cơ hội (TIP-026c): giai đoạn pipeline lead…negotiation (won / lost bị từ chối ở
// adapter; khoá 026b open / proposal vẫn nhận qua alias); cột xác suất của tệp cũ chỉ được nhận ra để BỎ QUA kèm cảnh báo (xác suất cố định).
import type { TransferField, TransferFieldType } from './field-types';

const f = (key: string, type: TransferFieldType, aliases: string[], o: Partial<TransferField> = {}): TransferField => ({ key, type, aliases, ...o });

const PARTY: TransferField[] = [
  f('contact_code', 'text', ['ma khach', 'ma khach hang', 'ma kh', 'customer code', 'contact code'], { max: 40 }),
  f('contact_phone', 'phone', ['sdt', 'so dien thoai', 'dien thoai', 'sdt khach', 'phone', 'customer phone'], { max: 30 }),
  f('contact_email', 'email', ['email', 'email khach', 'customer email'], { max: 200 }),
];
/** Id bản ghi của tệp xuất (cột chỉ đọc) — nhập lại thì dòng đó bị loại có lý do, không ghi lần hai / không cập nhật. */
const EXPORTED_ID = f('id', 'text', ['id', 'ma ban ghi', 'record id'], { max: 64 });

export const CONTACT_NOTE_FIELDS: readonly TransferField[] = [
  ...PARTY,
  f('kind', 'enum', ['loai', 'loai ghi chu', 'kind', 'type'], {
    options: ['note', 'comment'],
    optionAliases: { 'ghi chu': 'note', 'binh luan': 'comment', 'trao doi': 'comment' },
  }),
  f('body', 'text', ['noi dung', 'ghi chu', 'binh luan', 'body', 'note', 'content'], { required: true, max: 5000 }),
  EXPORTED_ID,
];

export const CONTACT_TASK_FIELDS: readonly TransferField[] = [
  ...PARTY,
  f('title', 'text', ['tieu de', 'ten viec', 'viec', 'cong viec', 'task', 'title'], { required: true, max: 200 }),
  f('description', 'text', ['mo ta', 'chi tiet', 'description'], { max: 5000 }),
  f('due', 'date', ['han', 'han chot', 'ngay het han', 'deadline', 'due', 'due date']),
  f('state', 'enum', ['trang thai', 'state', 'status'], {
    options: ['open', 'done', 'cancelled'],
    optionAliases: { mo: 'open', 'dang mo': 'open', 'chua xong': 'open', xong: 'done', 'hoan thanh': 'done', 'da huy': 'cancelled', huy: 'cancelled' },
  }),
  EXPORTED_ID,
];

export const CONTACT_OPPORTUNITY_FIELDS: readonly TransferField[] = [
  ...PARTY,
  f('title', 'text', ['tieu de', 'ten co hoi', 'co hoi', 'opportunity', 'title'], { required: true, max: 200 }),
  f('need', 'text', ['nhu cau', 'need', 'mo ta'], { max: 5000 }),
  f('expected_amount', 'money', ['gia tri ky vong', 'gia tri du kien', 'gia tri', 'expected amount', 'expected value', 'amount']),
  f('stage', 'enum', ['giai doan', 'stage'], {
    options: ['lead', 'qualified', 'demo', 'quote', 'negotiation', 'won', 'lost'],
    optionAliases: {
      open: 'lead', proposal: 'quote', moi: 'lead', 'lead moi': 'lead', 'du dieu kien': 'qualified', 'da xac dinh': 'qualified', 'tu van': 'demo', 'tu van / demo': 'demo',
      'bao gia': 'quote', 'de xuat': 'quote', 'dam phan': 'negotiation', 'da mua': 'won', thang: 'won', 'thanh cong': 'won', thua: 'lost', 'that bai': 'lost',
    },
  }),
  f('source_kind', 'enum', ['nguon', 'nguon co hoi', 'source'], {
    options: ['manual', 'conversation', 'campaign', 'renewal', 'referral', 'call'],
    optionAliases: { 'nhap tay': 'manual', 'hoi thoai': 'conversation', 'chien dich': 'campaign', 'gia han': 'renewal', 'gioi thieu': 'referral', 'cuoc goi': 'call' },
  }),
  /** Cột xác suất của tệp 026b — nhận ra để bỏ qua + cảnh báo `probability_warning: ignored` (không ghi). */
  f('probability', 'number', ['xac suat', 'ty le', 'kha nang', 'probability']),
  f('expected_close_date', 'date', ['ngay chot du kien', 'du kien chot', 'expected close', 'close date']),
  EXPORTED_ID,
];

/** Cột tệp xuất liệu trình (TIP-033b §5.1 — tập chỉ xuất, không ánh xạ nhập): mô tả cột cho năng lực / Trợ lý, không có tiền. */
export const CUSTOMER_PACKAGE_FIELDS: readonly TransferField[] = [
  ...PARTY.slice(0, 1),
  f('name', 'text', ['ten lieu trinh', 'lieu trinh', 'goi', 'package'], { max: 200 }),
  f('total', 'number', ['tong buoi', 'so buoi', 'total sessions']),
  f('used', 'number', ['da dung', 'used sessions']),
  f('remaining', 'number', ['con lai', 'remaining']),
  f('status', 'enum', ['trang thai', 'status'], { options: ['active', 'exhausted', 'expired', 'refunded'] }),
  f('expires_at', 'date', ['han dung', 'het han', 'expires']),
  EXPORTED_ID,
];

/** Cột tệp kết quả sửa ticket hàng loạt (TIP-034c §4.4 — chỉ xuất): id người gọi đã gửi, kết quả, mã lỗi an toàn, đã đổi, hoàn tác. */
export const TICKET_BULK_RESULT_FIELDS: readonly TransferField[] = [
  f('ticket_id', 'text', ['ticket', 'ma ticket', 'id']),
  f('outcome', 'enum', ['ket qua', 'outcome'], { options: ['ok', 'failed', 'pending'] }),
  f('error_code', 'text', ['ma loi', 'error']),
  f('changed', 'enum', ['da doi', 'changed'], { options: ['yes', 'no'] }),
  f('undo_state', 'enum', ['hoan tac', 'undo'], { options: ['eligible', 'pending', 'undone', 'conflict', 'failed'] }),
];
