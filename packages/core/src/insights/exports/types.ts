// Kiểu chung của xuất danh sách (TIP-038 pha 3): mỗi danh sách có một reader — chốt id theo đúng bộ lọc + thứ tự màn danh sách, và dựng dòng
// theo lô id (deferred join theo PK) dưới quyền HIỆN TẠI của người xuất. Cột là allowlist cố định + key tuỳ biến người xuất được thấy.
import type { AuthzContext, CustomFieldEntity, ListExportKind } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

/** Ô tệp: chữ (luôn ghi kiểu chuỗi — không công thức), số nguyên nhỏ, hoặc trống. Tiền VND là chuỗi chữ số (bigint không mất chữ số). */
export type Cell = string | number | null;

export interface ExportColumn {
  key: string;
  /** Nhãn cột (tên cột chuẩn đã dịch, hoặc nhãn trường tuỳ biến). */
  header: string;
  width?: number;
}

/** Ngữ cảnh dựng dòng: giờ workspace (ngày giờ in theo múi giờ này, ghi rõ ở tên cột), ngôn ngữ, khoá tuỳ biến được thấy. */
export interface ExportPlace {
  timeZone: string;
  locale: string;
  /** Key tuỳ biến người xuất được đọc VÀ bật "Xuất" ở định nghĩa — theo thứ tự định nghĩa. */
  custom: { key: string; label: string }[];
  names: (ids: readonly (string | null | undefined)[]) => Promise<Map<string, string>>;
}

export type ExportDb = Pick<
  TenantTx,
  '$queryRaw' | 'quote' | 'order' | 'contract' | 'ticket' | 'contact' | 'team' | 'aiAgent' | 'customFieldDef' | 'product' | 'productCategory' | 'invoice'
>;

export interface ListReader<F> {
  kind: ListExportKind;
  /** Entity trường tuỳ biến (null = danh sách không có trường tuỳ biến). */
  entity: CustomFieldEntity | null;
  /** Bộ lọc input action → bộ lọc repo (cùng ánh xạ với controller GET danh sách). */
  filter(input: Record<string, unknown>): F;
  /** Toàn bộ id khớp bộ lọc theo thứ tự danh sách — tối đa `cap`. */
  snapshot(tx: ExportDb, authz: AuthzContext, f: F, cap: number, now: Date): Promise<string[]>;
  columns(m: ExportLabels): ExportColumn[];
  /** Dòng của một lô id (giữ thứ tự; bản ghi đã xoá / ra ngoài scope HIỆN TẠI thì bỏ) — `ids` = id đã ra dòng. */
  rows(
    tx: ExportDb,
    authz: AuthzContext,
    ids: string[],
    place: ExportPlace,
    now: Date,
  ): Promise<{ ids: string[]; rows: Cell[][] }>;
}

export type ExportLabels = ReturnType<typeof import('@appchat/shared').serverMessages>['insights']['export'];
