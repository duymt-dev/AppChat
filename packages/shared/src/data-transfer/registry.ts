// Registry nhập / xuất dữ liệu (TIP-038b, DC-374): thực thể × thao tác × định dạng × trường được phép ghi — nguồn duy nhất cho backend
// (kiểm ánh xạ, chặn cột), Trợ lý (schema đóng cho tool) và web (TransferPanel). Không tên bảng / SQL / trường tuỳ ý: model chỉ chọn
// trong tập trường ở đây. Cột trạng thái / tiền đã thu / chữ ký / kho / điểm KHÔNG có trong registry nhập (phạm vi không nhập — TIP-038b).
// Thực thể chưa nối nhập ở pha hiện tại trả `supported: false` + lý do (không giả nút).
import { foldText } from '../crm/phone';
import type { TransferField, TransferFieldType } from './field-types';
import { CONTRACT_FIELDS, INVOICE_FIELDS, ORDER_FIELDS, PRODUCT_FIELDS, QUOTE_FIELDS } from './fields';
import { CONTACT_NOTE_FIELDS, CONTACT_OPPORTUNITY_FIELDS, CONTACT_TASK_FIELDS, CUSTOMER_PACKAGE_FIELDS, TICKET_BULK_RESULT_FIELDS } from './activity-fields';

/**
 * `ticket_category_suggestions` (TIP-034b §4): từ điển GỢI Ý danh mục ticket — cấu hình, không phải bản ghi ticket; nhập = thay cả bộ.
 * `ticket_bulk_results` (TIP-034c §4.4): kết quả từng id của MỘT thao tác sửa ticket hàng loạt — chỉ xuất, không phải bản ghi ticket.
 */
export const TRANSFER_ENTITIES = ['contact', 'product', 'quote', 'order', 'contract', 'invoice', 'ticket_category_suggestions', 'ticket_bulk_results'] as const;
export type TransferEntity = (typeof TRANSFER_ENTITIES)[number];
/**
 * Tập dữ liệu dưới một thực thể (TIP-026b §5): `base` = bản ghi chính của thực thể (038b); khách hàng có thêm 3 tập hoạt động CRM. Chọn
 * tường minh, cố định từ lúc lập kế hoạch (đổi tập = kế hoạch mới) — không trộn vào nhập khách, không bảng tuỳ ý.
 */
export const TRANSFER_DATASETS = ['base', 'contact_notes', 'contact_tasks', 'contact_opportunities', 'customer_packages'] as const;
export type TransferDataset = (typeof TRANSFER_DATASETS)[number];
export type ActivityDataset = 'contact_notes' | 'contact_tasks' | 'contact_opportunities';
/** Khoá registry: thực thể (tập base) hoặc tập con. */
export type TransferTarget = TransferEntity | Exclude<TransferDataset, 'base'>;
/** Tập hợp lệ theo thực thể — server suy enum từ đây, người dùng không chọn adapter tuỳ ý. */
export const DATASETS_OF: Record<TransferEntity, readonly TransferDataset[]> = {
  contact: ['base', 'contact_notes', 'contact_tasks', 'contact_opportunities', 'customer_packages'],
  product: ['base'],
  quote: ['base'],
  order: ['base'],
  contract: ['base'],
  invoice: ['base'],
  ticket_category_suggestions: ['base'],
  ticket_bulk_results: ['base'],
};
export const datasetAllowed = (e: TransferEntity, d: TransferDataset) => DATASETS_OF[e].includes(d);
export const targetOf = (e: TransferEntity, d: TransferDataset | null | undefined): TransferTarget =>
  !d || d === 'base' ? e : d;
export const TRANSFER_FORMATS = ['xlsx', 'csv'] as const;
export type TransferFormat = (typeof TRANSFER_FORMATS)[number];

export type { TransferField, TransferFieldType } from './field-types';

export interface TransferEntitySpec {
  entity: TransferEntity;
  dataset: TransferDataset;
  /** Phiên bản lược đồ cột của tập — đổi trường / luật kiểm thì tăng; kế hoạch cũ khác phiên bản phải lập lại (409). */
  schemaVersion: number;
  /** Quyền action nghiệp vụ ghi (nhập) / đọc (xuất) — kiểm theo người tạo, không suy từ quyền xem. */
  importPermission: string;
  /** Quyền action phải có thêm (nhập tập con: crm.import ∩ crm.edit) — không cấp gì mới. */
  alsoRequires?: readonly string[];
  exportAction: string;
  /** Action nghiệp vụ mỗi nhóm dòng đi qua (ActionExecutor) — vắng ở tập chỉ xuất. */
  writeAction?: string;
  /**
   * `export` = tập chỉ xuất (TIP-033b §5.1 — liệu trình: tổng / đã dùng / trạng thái không nhập được): nhập bị từ chối TRƯỚC khi đọc tệp /
   * lập kế hoạch AI / ghi (422 `dataset: export_only`); điều chỉnh buổi là quy trình package.adjust_sessions riêng.
   */
  direction?: 'both' | 'export';
  fields: readonly TransferField[];
  /** Nhập đã nối ở pha nào; chưa nối → `unsupported` + lý do. */
  importReady: boolean;
  /** Nhiều dòng tệp gom theo `group` thành MỘT bản ghi (header + dòng hàng — báo giá / đơn). */
  grouped?: boolean;
  /**
   * Cả tệp ghi bằng MỘT lệnh nghiệp vụ (sản phẩm: `product.import`; danh mục ticket: `ticket_categories.replace` thay cả bộ) — một dòng lỗi
   * là cả kế hoạch không xác nhận được (không có "chỉ nhập dòng hợp lệ"), không chạy nền theo lô, không đánh dấu "đã nhập" theo dòng.
   */
  atomic?: boolean;
}

const f = (
  key: string,
  type: TransferFieldType,
  aliases: string[],
  o: Partial<TransferField> = {},
): TransferField => ({ key, type, aliases, ...o });

/** TIP-034b §4.1: cột của tệp danh mục gợi ý — vị trí (tuỳ chọn, 1..N liên tục) + nhãn (luật validator dùng chung, kiểm ở adapter). */
const TICKET_CATEGORY_FIELDS: readonly TransferField[] = [
  f('position', 'number', ['vi tri', 'thu tu', 'stt', 'position', 'order', 'no', '#']),
  f('label', 'text', ['danh muc', 'ten danh muc', 'nhan', 'goi y', 'category', 'label', 'name'], { required: true, max: 400 }),
];

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

export const TRANSFER_REGISTRY: Record<TransferTarget, TransferEntitySpec> = {
  contact: {
    entity: 'contact',
    dataset: 'base',
    schemaVersion: 1,
    importPermission: 'crm.import',
    exportAction: 'contact.export',
    writeAction: 'contact.import',
    fields: CONTACT_FIELDS,
    importReady: true,
  },
  product: {
    entity: 'product',
    dataset: 'base',
    // 2 = TIP-027b: thêm cột `description_doc` + cảnh báo `formatting_reset` (kế hoạch lập trước đó phải lập lại — 409 stale).
    schemaVersion: 2,
    importPermission: 'catalog.manage',
    exportAction: 'product.export',
    writeAction: 'product.import',
    fields: PRODUCT_FIELDS,
    importReady: true,
    atomic: true,
  },
  quote: {
    entity: 'quote',
    dataset: 'base',
    schemaVersion: 1,
    importPermission: 'quote.create',
    exportAction: 'quote.export',
    writeAction: 'quote.create',
    fields: QUOTE_FIELDS,
    importReady: true,
    grouped: true,
  },
  order: {
    entity: 'order',
    dataset: 'base',
    schemaVersion: 1,
    importPermission: 'order.manage',
    exportAction: 'order.export',
    writeAction: 'order.create',
    fields: ORDER_FIELDS,
    importReady: true,
    grouped: true,
  },
  contract: {
    entity: 'contract',
    dataset: 'base',
    schemaVersion: 1,
    importPermission: 'contract.draft',
    exportAction: 'contract.export',
    writeAction: 'contract.create',
    fields: CONTRACT_FIELDS,
    importReady: true,
  },
  invoice: {
    entity: 'invoice',
    dataset: 'base',
    schemaVersion: 1,
    importPermission: 'invoice.manage',
    exportAction: 'invoice.export',
    writeAction: 'invoice.create',
    fields: INVOICE_FIELDS,
    importReady: true,
  },
  // TIP-026b §5 — tập hoạt động CRM dưới khách: mỗi dòng MỘT lệnh action canonical (ghi chú / bình luận theo `kind` của dòng).
  contact_notes: {
    entity: 'contact',
    dataset: 'contact_notes',
    schemaVersion: 1,
    importPermission: 'crm.import',
    alsoRequires: ['crm.edit'],
    exportAction: 'contact_note.export',
    writeAction: 'contact.add_note',
    fields: CONTACT_NOTE_FIELDS,
    importReady: true,
  },
  contact_tasks: {
    entity: 'contact',
    dataset: 'contact_tasks',
    schemaVersion: 1,
    importPermission: 'crm.import',
    alsoRequires: ['crm.edit'],
    exportAction: 'contact_task.export',
    writeAction: 'contact_task.create',
    fields: CONTACT_TASK_FIELDS,
    importReady: true,
  },
  contact_opportunities: {
    entity: 'contact',
    dataset: 'contact_opportunities',
    schemaVersion: 1,
    importPermission: 'crm.import',
    alsoRequires: ['crm.edit'],
    exportAction: 'contact_opportunity.export',
    writeAction: 'contact_opportunity.create',
    fields: CONTACT_OPPORTUNITY_FIELDS,
    importReady: true,
  },
  // TIP-034b §4 — từ điển gợi ý danh mục ticket: nhập = MỘT `ticket_categories.replace` thay cả bộ (≤ 100 nhãn, phiên bản cấu hình chụp lúc
  // lập kế hoạch); xuất = `ticket_categories.export` (chỉ bộ cấu hình, không nhãn lấy từ ticket). Quyền: settings.manage cho cả hai.
  ticket_category_suggestions: {
    entity: 'ticket_category_suggestions',
    dataset: 'base',
    schemaVersion: 1,
    importPermission: 'settings.manage',
    exportAction: 'ticket_categories.export',
    writeAction: 'ticket_categories.replace',
    fields: TICKET_CATEGORY_FIELDS,
    importReady: true,
    atomic: true,
  },
  // TIP-034c §4.4 — kết quả của MỘT thao tác sửa ticket hàng loạt: CHỈ XUẤT (ticket.bulk_export — id / kết quả / mã lỗi an toàn / đã đổi /
  // trạng thái hoàn tác; không tiêu đề / nội dung / ảnh chụp trước). Nhập tệp kết quả KHÔNG phải đường sửa ticket.
  ticket_bulk_results: {
    entity: 'ticket_bulk_results',
    dataset: 'base',
    schemaVersion: 1,
    importPermission: 'ticket.manage',
    exportAction: 'ticket.bulk_export',
    fields: TICKET_BULK_RESULT_FIELDS,
    importReady: false,
    direction: 'export',
  },
  // TIP-033b §5.1 — liệu trình của khách: CHỈ XUẤT (CSV / XLSX qua package.export, cùng PackagesRead + quyền hiện tại).
  customer_packages: {
    entity: 'contact',
    dataset: 'customer_packages',
    schemaVersion: 1,
    importPermission: 'crm.import',
    exportAction: 'package.export',
    fields: CUSTOMER_PACKAGE_FIELDS,
    importReady: false,
    direction: 'export',
  },
};
/** Tập chỉ xuất — nhập bị từ chối trước khi đọc tệp. */
export const exportOnly = (t: TransferTarget) => TRANSFER_REGISTRY[t].direction === 'export';

export const transferSpec = (e: TransferTarget) => TRANSFER_REGISTRY[e];
export const transferField = (e: TransferTarget, key: string) =>
  TRANSFER_REGISTRY[e].fields.find((x) => x.key === key);

/** Kế hoạch nháp sống 24 giờ (tệp tải lên chưa xác nhận cũng sống 24 giờ — file-access 045b). */
export const TRANSFER_PLAN_TTL_MS = 24 * 3600_000;
/** Dòng / cột tối đa một kế hoạch (đọc tệp theo XLSX_LIMITS) — quá → 422 yêu cầu tách, không cắt ngầm. */
export const TRANSFER_MAX_ROWS = 20_000;
export const TRANSFER_MAX_COLS = 60;
/** ≤ ngưỡng: ghi ngay sau xác nhận (afterCommit); > ngưỡng: việc nền `data_job`. */
export const TRANSFER_SYNC_ROWS = 500;
/** Chứng từ (báo giá / đơn / hợp đồng / đề nghị): mỗi chứng từ một action — > ngưỡng chạy nền. */
export const TRANSFER_SYNC_DOCS = 50;
/** Số dòng mẫu tối đa đưa cho model (đã che) — không gửi toàn tệp. */
export const TRANSFER_AI_SAMPLE_ROWS = 20;

const normHeader = (s: string) =>
  foldText(s)
    .replace(/[_.:*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Đoán ánh xạ tất định từ tên cột: trường → tên cột (mỗi trường tối đa một cột, cột đầu tiên khớp). */
export function guessTransferMapping(
  entity: TransferTarget,
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
