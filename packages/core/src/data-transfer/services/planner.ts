// Kế hoạch nhập (TIP-038b, DC-374): đọc tệp người tạo đã tải (`checkFile` — chính người tải, purpose import | attachment, ≤ 24 giờ chưa
// xác nhận) → bảng → ánh xạ (người / model chọn trong registry; thiếu thì đoán theo tên cột) → kiểm tất định từng dòng → phân loại trùng
// (adapter thực thể) → ghi `transfer_plan` + `transfer_row` (dữ liệu chuẩn hoá của chính tệp, không dữ liệu khách khác). Đổi ánh xạ =
// đọc lại tệp (checksum phải khớp — tệp đổi sau xem trước → 409), kiểm lại, tăng `version`. Chỉ người tạo thấy kế hoạch.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import {
  AppError,
  TRANSFER_PLAN_TTL_MS,
  guessTransferMapping,
  transferSpec,
  type TransferEntity,
} from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { checkFile, type FileAccessRule } from '../../kernel/files/file-access';
import type { FilesService } from '../../kernel/files/files.service';
import { uuidv7 } from '../../kernel/ids';
import { parseTransferFile, type ParsedTable } from './file-parser';
import { checkRow, resolveMapping, type CheckedRow } from './validation';
import { classifyFor, type RowCheck } from '../adapters';

export const TRANSFER_FILE_RULE: FileAccessRule = {
  purposes: ['import', 'attachment'],
  mimes: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain',
  ],
};

export interface PreparedPlan {
  file: { id: string; name: string; sha256: string };
  table: ParsedTable;
  mapping: Record<string, string>;
  rows: (CheckedRow & { check: RowCheck })[];
}

/** Khoá dòng ổn định giữa các lần kiểm lại cùng tệp: checksum + sheet + số dòng (không phụ thuộc ánh xạ). */
export const rowKeyOf = (sha: string, sheet: string | null, rowNo: number) =>
  createHash('sha256')
    .update(`${sha}|${sheet ?? ''}|${rowNo}`)
    .digest('hex')
    .slice(0, 32);

/** Đọc + kiểm tệp NGOÀI transaction (exceljs chậm). Lỗi tệp / quyền / ánh xạ → 422 trước khi ghi gì. */
export async function preparePlan(
  db: TenantDb,
  files: FilesService,
  a: {
    userId: string;
    entity: TransferEntity;
    fileId: string;
    sheet?: string | null;
    mapping?: Record<string, string>;
    expectSha?: string;
    now: Date;
  },
): Promise<Omit<PreparedPlan, 'rows'> & { checked: CheckedRow[] }> {
  if (!transferSpec(a.entity).importReady)
    throw new AppError('VALIDATION_FAILED', 422, { entity: 'unsupported' });
  const g = await checkFile(db, a.userId, a.fileId, TRANSFER_FILE_RULE, a.now);
  if ('denied' in g) throw new AppError('VALIDATION_FAILED', 422, { file_id: g.denied });
  const f = await files.read(db, g.id);
  if (!f) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
  if (a.expectSha && f.row.sha256 !== a.expectSha)
    throw new AppError('CONFLICT', 409, { file_id: 'changed' });
  const table = await parseTransferFile({ name: f.row.name, mime: f.row.mime, body: f.body }, a.sheet);
  const mapping = a.mapping ?? guessTransferMapping(a.entity, table.columns);
  const cols = resolveMapping(a.entity, table.columns, mapping);
  const checked = table.rows
    .map((r, k) => checkRow(a.entity, cols, r, k + 1))
    .filter((r) => Object.keys(r.data).length || Object.keys(r.errors).length);
  return { file: { id: f.row.id, name: f.row.name, sha256: f.row.sha256 }, table, mapping, checked };
}

/** Phân loại trùng trong transaction (đọc DB tenant theo adapter) → dòng có kết quả kiểm. */
export async function classify(
  tx: TenantTx,
  entity: TransferEntity,
  actorUserId: string,
  checked: CheckedRow[],
): Promise<PreparedPlan['rows']> {
  const kinds = await classifyFor(entity)(tx, actorUserId, checked);
  return checked.map((r, i) => ({ ...r, check: Object.keys(r.errors).length ? 'invalid' : kinds[i]! }));
}

const counts = (rows: PreparedPlan['rows']) => ({
  total: rows.length,
  valid: rows.filter((r) => r.check === 'valid').length,
  invalid: rows.filter((r) => r.check === 'invalid').length,
  duplicates: rows.filter((r) => r.check === 'duplicate' || r.check === 'owned').length,
});

async function writeRows(
  tx: TenantTx,
  planId: string,
  p: Pick<PreparedPlan, 'file' | 'table' | 'rows'>,
  now: Date,
) {
  for (let i = 0; i < p.rows.length; i += 1000) {
    await tx.transferRow.createMany({
      data: p.rows.slice(i, i + 1000).map((r) => ({
        id: uuidv7(now.getTime()),
        planId,
        rowKey: rowKeyOf(p.file.sha256, p.table.sheet, r.rowNo),
        rowNo: r.rowNo,
        data: r.data,
        check: r.check,
        errors: r.errors,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }
}

export async function createPlan(
  tx: TenantTx,
  a: { userId: string; entity: TransferEntity; aiRunId?: string | null; now: Date },
  p: PreparedPlan,
): Promise<string> {
  const id = uuidv7(a.now.getTime());
  await tx.transferPlan.create({
    data: {
      id,
      actorUserId: a.userId,
      entity: a.entity,
      fileId: p.file.id,
      fileSha256: p.file.sha256,
      fileName: p.file.name,
      sheet: p.table.sheet,
      mapping: p.mapping,
      ...counts(p.rows),
      aiRunId: a.aiRunId ?? null,
      expiresAt: new Date(a.now.getTime() + TRANSFER_PLAN_TTL_MS),
      createdAt: a.now,
      updatedAt: a.now,
    },
  });
  await writeRows(tx, id, p, a.now);
  return id;
}

/** Thay toàn bộ dòng bằng kết quả kiểm mới (ánh xạ / chính sách đổi) + tăng version — CAS theo `if_version`. */
export async function replanRows(
  tx: TenantTx,
  planId: string,
  ifVersion: number,
  patch: { mapping: Record<string, string>; rowPolicy?: 'all_valid' | 'only_valid' },
  p: PreparedPlan,
  now: Date,
) {
  const n = await tx.transferPlan.updateMany({
    where: { id: planId, version: ifVersion, status: 'draft' },
    data: {
      mapping: patch.mapping,
      ...(patch.rowPolicy ? { rowPolicy: patch.rowPolicy } : {}),
      ...counts(p.rows),
      version: { increment: 1 },
      updatedAt: now,
    },
  });
  if (!n.count) throw new AppError('CONFLICT', 409, { if_version: 'stale' });
  await tx.transferRow.deleteMany({ where: { planId } });
  await writeRows(tx, planId, p, now);
}

/** Kế hoạch của chính người gọi (người khác — kể cả Owner — 404 như không có: dòng chứa dữ liệu tệp riêng). */
export async function ownPlan(
  db: Pick<TenantDb, 'transferPlan'> | TenantTx,
  id: string,
  userId: string | null,
  lock = false,
) {
  if (lock && 'transferRow' in db)
    await (db as TenantTx).$queryRaw`SELECT id FROM transfer_plan WHERE id = ${id}::uuid FOR UPDATE`;
  const p = await db.transferPlan.findUnique({ where: { id } });
  if (!p || !userId || p.actorUserId !== userId)
    throw new AppError('NOT_FOUND', 404, { plan_id: 'not_found' });
  return p;
}
