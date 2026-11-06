// Registry nhập / xuất dữ liệu (TIP-038b, DC-374): thực thể × thao tác × định dạng × trường được phép ghi — nguồn duy nhất cho backend
// (kiểm ánh xạ, chặn cột), Trợ lý (schema đóng cho tool) và web (TransferPanel). Không tên bảng / SQL / trường tuỳ ý: model chỉ chọn
// trong tập trường ở đây. Cột trạng thái / tiền đã thu / chữ ký / kho / điểm KHÔNG có trong registry nhập (phạm vi không nhập — TIP-038b).
// Thực thể chưa nối nhập ở pha hiện tại trả `supported: false` + lý do (không giả nút).
import { foldText } from '../crm/phone';

export const TRANSFER_ENTITIES = ['contact', 'product', 'quote', 'order', 'contract', 'invoice'] as const;
export type TransferEntity = (typeof TRANSFER_ENTITIES)[number];
export const TRANSFER_FORMATS = ['xlsx', 'csv'] as const;
export type TransferFormat = (typeof TRANSFER_FORMATS)[number];

/** Kiểu giá trị sau chuẩn hoá (kiểm tất định ở core, không để model tự sửa giá trị). */
export type TransferFieldType = 'text' | 'phone' | 'email' | 'money' | 'number' | 'date' | 'enum';

export interface TransferField {
  key: string;
  type: TransferFieldType;
  required?: boolean;
  max?: number;
  options?: readonly string[];
  /** Tên cột thường gặp (không dấu, thường) — đoán ánh xạ thủ công / gợi ý cho model. */
  aliases: readonly string[];
}

export interface TransferEntitySpec {
  entity: TransferEntity;
  /** Quyền action nghiệp vụ ghi (nhập) / đọc (xuất) — kiểm theo người tạo, không suy từ quyền xem. */
  importPermission: string;
  exportAction: string;
  /** Action nghiệp vụ mỗi nhóm dòng đi qua (ActionExecutor). */
  writeAction: string;
  fields: readonly TransferField[];
  /** Nhập đã nối ở pha nào; chưa nối → `unsupported` + lý do. */
  importReady: boolean;
}

const f = (
  key: string,
  type: TransferFieldType,
  aliases: string[],
  o: Partial<TransferField> = {},
): TransferField => ({ key, type, aliases, ...o });

const CONTACT_FIELDS: readonly TransferField[] = [
  f(
    'full_name',
    'text',
    [
      'ho ten',
      'ho va ten',
      'ten',
      'ten khach',
      'ten khach hang',
      'khach hang',
      'name',
      'full name',
      'fullname',
      'customer',
      'customer name',
    ],
    { required: true, max: 120 },
  ),
  f(
    'phone',
    'phone',
    ['so dien thoai', 'dien thoai', 'sdt', 'so dt', 'di dong', 'phone', 'phone number', 'mobile', 'tel'],
    { max: 30 },
  ),
  f('email', 'email', ['email', 'e-mail', 'mail', 'thu dien tu'], { max: 200 }),
  f('title', 'text', ['chuc danh', 'chuc vu', 'title', 'job title', 'position'], { max: 80 }),
  f('zalo', 'phone', ['zalo'], { max: 30 }),
  f('address', 'text', ['dia chi', 'address', 'street'], { max: 200 }),
  f('city', 'text', ['tinh', 'thanh pho', 'tinh/thanh pho', 'tinh thanh', 'khu vuc', 'city', 'province'], {
    max: 60,
  }),
  f('district', 'text', ['quan', 'huyen', 'quan/huyen', 'quan huyen', 'district'], { max: 60 }),
  f('source', 'enum', ['nguon', 'nguon khach', 'source'], {
    options: ['zalo_personal', 'email', 'website', 'manual', 'referral'],
  }),
];

export const TRANSFER_REGISTRY: Record<TransferEntity, TransferEntitySpec> = {
  contact: {
    entity: 'contact',
    importPermission: 'crm.import',
    exportAction: 'contact.export',
    writeAction: 'contact.import',
    fields: CONTACT_FIELDS,
    importReady: true,
  },
  product: {
    entity: 'product',
    importPermission: 'catalog.manage',
    exportAction: 'product.export',
    writeAction: 'product.import',
    fields: [],
    importReady: false,
  },
  quote: {
    entity: 'quote',
    importPermission: 'quote.create',
    exportAction: 'quote.export',
    writeAction: 'quote.create',
    fields: [],
    importReady: false,
  },
  order: {
    entity: 'order',
    importPermission: 'order.manage',
    exportAction: 'order.export',
    writeAction: 'order.create',
    fields: [],
    importReady: false,
  },
  contract: {
    entity: 'contract',
    importPermission: 'contract.draft',
    exportAction: 'contract.export',
    writeAction: 'contract.create',
    fields: [],
    importReady: false,
  },
  invoice: {
    entity: 'invoice',
    importPermission: 'invoice.manage',
    exportAction: 'invoice.export',
    writeAction: 'invoice.create',
    fields: [],
    importReady: false,
  },
};

export const transferSpec = (e: TransferEntity) => TRANSFER_REGISTRY[e];
export const transferField = (e: TransferEntity, key: string) =>
  TRANSFER_REGISTRY[e].fields.find((x) => x.key === key);

/** Kế hoạch nháp sống 24 giờ (tệp tải lên chưa xác nhận cũng sống 24 giờ — file-access 045b). */
export const TRANSFER_PLAN_TTL_MS = 24 * 3600_000;
/** Dòng / cột tối đa một kế hoạch (đọc tệp theo XLSX_LIMITS) — quá → 422 yêu cầu tách, không cắt ngầm. */
export const TRANSFER_MAX_ROWS = 20_000;
export const TRANSFER_MAX_COLS = 60;
/** ≤ ngưỡng: ghi ngay sau xác nhận (afterCommit); > ngưỡng: việc nền `data_job`. */
export const TRANSFER_SYNC_ROWS = 500;
/** Số dòng mẫu tối đa đưa cho model (đã che) — không gửi toàn tệp. */
export const TRANSFER_AI_SAMPLE_ROWS = 20;

const normHeader = (s: string) =>
  foldText(s)
    .replace(/[_.:*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Đoán ánh xạ tất định từ tên cột: trường → tên cột (mỗi trường tối đa một cột, cột đầu tiên khớp). */
export function guessTransferMapping(
  entity: TransferEntity,
  columns: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  const taken = new Set<string>();
  for (const field of TRANSFER_REGISTRY[entity].fields) {
    const col = columns.find((c) => !taken.has(c) && field.aliases.includes(normHeader(c)));
    if (col) {
      out[field.key] = col;
      taken.add(col);
    }
  }
  return out;
}
