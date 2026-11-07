// Kiểu dùng chung của adapter nhập theo thực thể (TIP-038b): phân loại lúc lập kế hoạch (trong transaction, theo phạm vi GHI của người
// nhập) + chia dòng chờ thành đơn vị ghi nguyên tử (một lệnh action nghiệp vụ) + ghép kết quả action ↔ dòng.
import type { TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { CheckedRow } from '../services/validation';

export type RowCheck = 'valid' | 'invalid' | 'duplicate' | 'owned';
/** Người nhập (quyền hiện tại) — tra khách / đơn trong phạm vi GHI của họ, không rộng hơn. */
export type Importer = { userId: string; authz: AuthzContext };
/** Có thể bổ sung `groupKey` / id đã tra (contact_id, product_id…) vào dòng; trả kết quả kiểm theo thứ tự. */
export type Classifier = (tx: TenantTx, who: Importer, rows: CheckedRow[]) => Promise<RowCheck[]>;

/** Một dòng đang chờ ghi (biên nhận `transfer_row`). */
export type PendingRow = { id: string; rowNo: number; groupKey: string | null; data: Record<string, string> };

/** Một lệnh action nghiệp vụ cho một đơn vị ghi nguyên tử (lô khách / một chứng từ gồm các dòng hàng của nhóm). */
export interface WriteUnit {
  rows: PendingRow[];
  /** Phần riêng của khoá idempotency `transfer:<plan>:<key>:<version>`. */
  key: string;
  input: unknown;
}

/** Dòng → bản ghi tạo ra (null = bỏ qua — trùng phát sinh lúc ghi). */
export type UnitResult = Map<string, { id: string; code: string | null } | null>;

/** Ghi riêng cả kế hoạch (sản phẩm: một lệnh `product.import` trên chính tệp — cùng bộ kiểm 032b). */
export type WholeCommit = (a: {
  db: TenantDb;
  ws: string;
  plan: { id: string; actorUserId: string; version: number; fileId: string; mapping: unknown };
  ctx: ActionContext;
  executor: Pick<ActionExecutor, 'execute'>;
  shouldStop: () => Promise<boolean>;
  now: () => Date;
}) => Promise<void>;

export interface Adapter {
  classify: Classifier;
  /** Số dòng (không nhóm) / số nhóm (grouped) đọc mỗi vòng ghi. */
  batch: number;
  /** Dòng cùng `groupKey` luôn vào cùng một đơn vị (không cắt nhóm giữa hai vòng). */
  grouped?: boolean;
  units?: (rows: PendingRow[], who: { userId: string }) => WriteUnit[];
  resolve?: (db: TenantDb, unit: WriteUnit, result: unknown) => Promise<UnitResult>;
  whole?: WholeCommit;
}
