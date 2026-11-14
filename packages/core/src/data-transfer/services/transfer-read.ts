// Đọc nhập / xuất dữ liệu (TIP-038b): kế hoạch của chính người gọi (người khác — kể cả Owner — 404), trang dòng theo kết quả kiểm (keyset
// `row_no`, giới hạn 100 — index `transfer_row_plan_row_idx`), năng lực theo thực thể × quyền người gọi. Đọc không đổi trạng thái.
import { getAction } from '@appchat/actions';
import {
  AppError,
  DATASETS_OF,
  TRANSFER_ENTITIES,
  TRANSFER_FORMATS,
  can,
  targetOf,
  transferSpec,
  type AuthzContext,
  type PermissionKey,
  type TransferCapabilityDto,
  type TransferRowDto,
} from '@appchat/shared';
import { TransferDeps } from '../data-transfer.providers';
import { parseTransferFile } from './file-parser';
import { ownPlan } from './planner';
import { canImport, planView } from './plan-view';

const MAX = 100;
const CHECKS = new Set(['valid', 'invalid', 'duplicate', 'owned']);

export class TransferReadService {
  constructor(private readonly d: TransferDeps) {}

  async plan(ws: string, userId: string, id: string) {
    const db = await this.d.db(ws, 'transfer.read');
    const p = await ownPlan(db, id, userId);
    let columns: string[] = [];
    const f = await this.d.files().read(db, p.fileId);
    if (f && f.row.sha256 === p.fileSha256)
      columns =
        (
          await parseTransferFile({ name: f.row.name, mime: f.row.mime, body: f.body }, p.sheet).catch(
            () => null,
          )
        )?.columns ?? [];
    return planView(p, columns);
  }

  async rows(
    ws: string,
    userId: string,
    id: string,
    q: { check?: string; cursor?: string; limit?: string },
  ): Promise<{ data: TransferRowDto[]; next_cursor: string | null }> {
    const db = await this.d.db(ws, 'transfer.read');
    await ownPlan(db, id, userId);
    if (q.check && !CHECKS.has(q.check)) throw new AppError('VALIDATION_FAILED', 422, { check: 'invalid' });
    const after = q.cursor ? Number(q.cursor) : 0;
    if (!Number.isInteger(after) || after < 0)
      throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
    const n = Math.min(Math.max(Number(q.limit ?? 50) || 50, 1), MAX);
    const rows = await db.transferRow.findMany({
      where: { planId: id, ...(q.check ? { check: q.check } : {}), rowNo: { gt: after } },
      orderBy: { rowNo: 'asc' },
      take: n + 1,
    });
    const page = rows.slice(0, n);
    return {
      data: page.map((r) => ({
        row_no: r.rowNo,
        data: r.data as Record<string, string>,
        check: r.check as TransferRowDto['check'],
        errors: r.errors as Record<string, string>,
        status: r.status as TransferRowDto['status'],
        result_id: r.resultId,
        result_code: r.resultCode,
      })),
      next_cursor: rows.length > n ? String(page.at(-1)!.rowNo) : null,
    };
  }

  /**
   * Năng lực theo thực thể × tập (TIP-026b §5 — khách có thêm 3 tập hoạt động): nhập (đã nối + quyền nhập ∩ quyền action) và xuất (action
   * xuất có sẵn + quyền của action đó). Chỉ CSV / XLSX — PDF / DOCX không phải nguồn bảng cho các tập này (không giả bộ đọc).
   */
  capabilities(authz: AuthzContext): TransferCapabilityDto[] {
    return TRANSFER_ENTITIES.flatMap((entity) => DATASETS_OF[entity].map((dataset) => ({ entity, dataset }))).map(({ entity, dataset }) => {
      const s = transferSpec(targetOf(entity, dataset));
      const exportPerm = getAction(s.exportAction)?.permission;
      const allowed = canImport(authz, targetOf(entity, dataset));
      return {
        entity,
        dataset,
        import: {
          supported: s.importReady && allowed,
          reason: !s.importReady ? 'not_available' : allowed ? null : 'forbidden',
          formats: [...TRANSFER_FORMATS],
          fields: s.fields.map((f) => ({ key: f.key, required: !!f.required })),
        },
        export: {
          supported: !!exportPerm && can(authz, exportPerm as PermissionKey),
          reason: !exportPerm
            ? 'not_available'
            : can(authz, exportPerm as PermissionKey)
              ? null
              : 'forbidden',
          action_id: s.exportAction,
        },
      };
    });
  }
}
