// Trường nhập 3 tập dữ liệu hoạt động CRM dưới thực thể khách (TIP-026b §5): ghi chú / bình luận, việc chăm sóc, cơ hội. Khách tra bằng
// mã khách / SĐT / email trong phạm vi GHI của người nhập (không tự tạo khách, không đoán khi trùng nhiều). Không có cột người phụ trách /
// tác giả / thời điểm tạo (không ghi đè audit); `id` chỉ để nhận ra dòng xuất từ hệ thống khi nhập lại (bị loại, không cập nhật ngầm).
// Trạng thái việc chỉ nhận `open` (việc nhập luôn mở); giai đoạn cơ hội chỉ open / qualified / proposal (won / lost bị từ chối ở adapter).
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
    options: ['open', 'qualified', 'proposal', 'won', 'lost'],
    optionAliases: { moi: 'open', 'da xac dinh': 'qualified', 'de xuat': 'proposal', thang: 'won', 'thanh cong': 'won', thua: 'lost', 'that bai': 'lost' },
  }),
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
