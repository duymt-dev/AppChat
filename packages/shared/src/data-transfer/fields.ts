// Trường nhập theo thực thể (TIP-038b P2, DC-374) — tách khỏi registry.ts (trần dòng). Chỉ trường action nghiệp vụ nhận khi TẠO NHÁP:
// không trạng thái / tiền đã thu / ngày ký / chữ ký / kho / điểm. Commerce: `group` = khoá nhóm (nhiều dòng cùng mã → MỘT bản ghi gồm
// nhiều dòng hàng), trường `scope: 'item'` thuộc dòng hàng; khách tra bằng SĐT / email / mã khách (không tự đoán khi trùng nhiều).
// Alias tên cột / giá trị enum viết không dấu, thường (so sau `foldText`).
import type { TransferField, TransferFieldType } from './field-types';

const f = (
  key: string,
  type: TransferFieldType,
  aliases: string[],
  o: Partial<TransferField> = {},
): TransferField => ({
  key,
  type,
  aliases,
  ...o,
});
const item = (key: string, type: TransferFieldType, aliases: string[], o: Partial<TransferField> = {}) =>
  f(key, type, aliases, { ...o, scope: 'item' });

const TAX = {
  options: ['0', '5', '8', '10'],
  optionAliases: { '0%': '0', '5%': '5', '8%': '8', '10%': '10' },
} as const;

/** Khách của chứng từ: một trong ba (adapter kiểm), tra trong phạm vi GHI của người nhập. */
const PARTY: TransferField[] = [
  f(
    'contact_phone',
    'phone',
    ['sdt', 'so dien thoai', 'dien thoai', 'sdt khach', 'phone', 'customer phone'],
    { max: 30 },
  ),
  f('contact_email', 'email', ['email', 'email khach', 'customer email'], { max: 200 }),
  f('contact_code', 'text', ['ma khach', 'ma khach hang', 'ma kh', 'customer code'], { max: 40 }),
];

const GROUP = f(
  'group',
  'text',
  [
    'ma nhom',
    'nhom',
    'so chung tu',
    'ma chung tu',
    'ma bao gia',
    'so bao gia',
    'ma don',
    'so don',
    'group',
    'ref',
  ],
  {
    max: 60,
  },
);

const LINES: TransferField[] = [
  item(
    'item_name',
    'text',
    [
      'ten hang',
      'ten san pham',
      'san pham',
      'dich vu',
      'hang muc',
      'mo ta hang',
      'item',
      'product',
      'item name',
    ],
    {
      required: true,
      max: 200,
    },
  ),
  item('item_sku', 'text', ['ma hang', 'ma san pham', 'ma sp', 'sku', 'item code'], { max: 40 }),
  item('qty', 'number', ['so luong', 'sl', 'qty', 'quantity'], { required: true }),
  item('unit_price', 'money', ['don gia', 'gia', 'gia ban', 'unit price', 'price'], { required: true }),
  item('tax_rate', 'enum', ['thue', 'thue suat', 'vat', 'thue gtgt', 'tax', 'tax rate'], {
    required: true,
    ...TAX,
  }),
];

export const PRODUCT_FIELDS: readonly TransferField[] = [
  f('name', 'text', ['ten', 'ten san pham', 'ten hang', 'san pham', 'name', 'product name'], {
    required: true,
    max: 160,
  }),
  f('price', 'money', ['gia', 'gia ban', 'don gia', 'price'], { required: true }),
  f('sku', 'text', ['ma', 'ma hang', 'ma san pham', 'ma sp', 'sku', 'code'], { max: 40 }),
  f('type', 'text', ['loai', 'loai san pham', 'type'], { max: 40 }),
  f('category', 'text', ['danh muc', 'nhom hang', 'category'], { max: 60 }),
  f('unit', 'text', ['don vi', 'don vi tinh', 'dvt', 'unit'], { max: 20 }),
  f('tax_rate', 'text', ['thue', 'thue suat', 'vat', 'tax', 'tax rate'], { max: 8 }),
  // Chữ thuần (phép chiếu): khác chữ hiện có của sản phẩm đã định dạng → cảnh báo `description_warning: formatting_reset` trước khi xác nhận.
  f('description', 'text', ['mo ta', 'ghi chu', 'description'], { max: 4000, hint: 'plain_projection', warnings: ['formatting_reset'] }),
  // TIP-027b: tài liệu định dạng tuỳ chọn (JSON schema đóng, ≤ 32 KiB) — khứ hồi định dạng; không ánh xạ tự đoán từ cột khác.
  f('description_doc', 'description_doc', ['description doc', 'mo ta dinh dang'], { max: 32768, hint: 'structured_json' }),
  f('sessions', 'text', ['so buoi', 'sessions'], { max: 8 }),
  f('valid_days', 'text', ['so ngay hieu luc', 'han dung', 'valid days'], { max: 8 }),
];

export const QUOTE_FIELDS: readonly TransferField[] = [
  GROUP,
  ...PARTY,
  ...LINES,
  f('valid_days', 'number', ['hieu luc', 'so ngay hieu luc', 'valid days']),
  f('payment_terms', 'text', ['dieu khoan thanh toan', 'payment terms'], { max: 2000 }),
  f('note', 'text', ['ghi chu', 'note'], { max: 2000 }),
];

export const ORDER_FIELDS: readonly TransferField[] = [
  GROUP,
  ...PARTY,
  ...LINES,
  f('deposit_amount', 'money', ['dat coc', 'tien coc', 'deposit']),
  f('note', 'text', ['ghi chu', 'note'], { max: 2000 }),
];

export const CONTRACT_FIELDS: readonly TransferField[] = [
  ...PARTY,
  f('kind', 'enum', ['loai hop dong', 'loai', 'kind', 'type'], {
    required: true,
    options: ['service', 'sale', 'framework'],
    optionAliases: {
      'dich vu': 'service',
      'ban hang': 'sale',
      'mua ban': 'sale',
      khung: 'framework',
      'nguyen tac': 'framework',
    },
  }),
  f('title', 'text', ['ten hop dong', 'tieu de', 'title'], { max: 200 }),
  f('value', 'money', ['gia tri', 'gia tri hop dong', 'value', 'amount'], { required: true }),
  f('number', 'text', ['so hop dong', 'so hd', 'contract number'], { max: 60 }),
  f('start_date', 'date', ['ngay bat dau', 'tu ngay', 'start date']),
  f('end_date', 'date', ['ngay ket thuc', 'den ngay', 'end date']),
  f('note', 'text', ['ghi chu', 'note'], { max: 2000 }),
];

export const INVOICE_FIELDS: readonly TransferField[] = [
  ...PARTY,
  f('order_code', 'text', ['ma don', 'so don', 'ma don hang', 'order', 'order code'], { max: 40 }),
  f('kind', 'enum', ['loai', 'loai thanh toan', 'kind'], {
    required: true,
    options: ['deposit', 'installment', 'full'],
    optionAliases: {
      'dat coc': 'deposit',
      coc: 'deposit',
      dot: 'installment',
      'theo dot': 'installment',
      'toan bo': 'full',
      'tat toan': 'full',
    },
  }),
  f('amount', 'money', ['so tien', 'so tien de nghi', 'amount'], { required: true }),
  f('due_date', 'date', ['han thanh toan', 'han', 'due date']),
  f('title', 'text', ['noi dung', 'tieu de', 'title'], { max: 200 }),
  f('note', 'text', ['ghi chu', 'note'], { max: 2000 }),
];
