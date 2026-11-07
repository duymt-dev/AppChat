// Đọc việc dữ liệu (TIP-045b annex D) cho GET /v1/data-jobs/:id, /:id/items và /:id/download. Chỉ NGƯỜI TẠO việc (không phải Owner xem
// hộ — tệp xuất mang dữ liệu theo quyền của người tạo) và còn quyền của action gốc; khác → 404 như không có. Tệp xuất chỉ tải qua route
// có xác thực này (không URL storage thô): hết 24 giờ / quyền bị thu / chính sách trường hoặc scope (xuất danh sách — TIP-038) đã đổi so
// với lúc xuất → 410, phải xuất lại.
import { getAction } from '@appchat/actions';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { AppError, can, type AuthzContext, type DataJobDto, type DataJobItemDto, type PermissionKey } from '@appchat/shared';
import { fieldView } from '../../authz/fields/policy';
import type { FieldView } from '../../authz/fields/types';
import type { Storage } from '../files/storage';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 100;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Viewer = { workspaceId: string; userId: string; authz: AuthzContext };

/** Dấu quyền của tệp xuất theo kind (chính sách trường / scope đổi so với lúc xuất → tệp cũ không tải nữa). Domain đăng ký kind của mình. */
/** `job.input` cho kind cần kiểm lại bản ghi gốc (lịch sử một khách — TIP-025b: không còn thấy khách → dấu khác → 410). */
type ExportStamp = (db: TenantDb, a: AuthzContext, job: { input: unknown }) => Promise<string>;
const STAMPS = new Map<string, ExportStamp>([['contact.export', async (db, a) => policyStamp(await fieldView(db, 'contact', a))]]);
export const registerExportStamp = (kind: string, s: ExportStamp) => void STAMPS.set(kind, s);

/** Dấu chính sách trường của tệp xuất: vai trò trường + phiên bản định nghĩa — đổi một trong hai → tệp cũ không tải nữa. */
export const policyStamp = (v: Pick<FieldView, 'role' | 'version'>) => `${v.role}|${v.version}`;

export const allowedAction = (a: AuthzContext, actionId: string) => {
  const p = getAction(actionId)?.permission;
  return !!p && (p === 'self' || (p !== 'platform_admin' && can(a, p as PermissionKey)));
};

export class DataJobStatusService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly storage: Storage | null,
    private readonly now: () => Date,
  ) {}

  private async own(v: Viewer, id: string): Promise<{ db: TenantDb; job: NonNullable<Awaited<ReturnType<TenantDb['dataJob']['findUnique']>>> }> {
    const db = await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    const job = UUID.test(id) ? await db.dataJob.findUnique({ where: { id } }) : null;
    if (!job || job.actorId !== v.userId || !allowedAction(v.authz, job.actionId)) throw new AppError('NOT_FOUND', 404, { job_id: 'not_found' });
    return { db, job };
  }

  /** Tệp còn tải được: còn hạn + chính sách trường như lúc xuất. */
  private async downloadable(db: TenantDb, a: AuthzContext, job: { kind: string; fileKey: string | null; expiresAt: Date | null; fieldPolicy: string; input: unknown }): Promise<boolean> {
    if (!job.fileKey || !job.expiresAt || job.expiresAt <= this.now()) return false;
    const stamp = STAMPS.get(job.kind);
    return !stamp || (await stamp(db, a, job)) === job.fieldPolicy;
  }

  async status(v: Viewer, id: string): Promise<DataJobDto> {
    const { db, job } = await this.own(v, id);
    const ok = await this.downloadable(db, v.authz, job);
    return {
      id: job.id,
      kind: job.kind,
      action_id: job.actionId,
      status: job.status as DataJobDto['status'],
      total: job.total,
      done: job.done,
      failed: job.failed,
      error: job.error,
      download_url: ok ? `/v1/data-jobs/${job.id}/download` : null,
      file_name: ok ? job.fileName : null,
      expires_at: ok ? job.expiresAt!.toISOString() : null,
      created_at: job.createdAt.toISOString(),
      finished_at: job.finishedAt?.toISOString() ?? null,
    };
  }

  /** Biên nhận từng bản ghi (con trỏ = seq) — `only = failed` cho danh sách lỗi. */
  async items(v: Viewer, id: string, q: { cursor?: string; limit?: number; only?: 'failed' }): Promise<{ data: DataJobItemDto[]; next_cursor: string | null }> {
    const { db } = await this.own(v, id);
    const limit = Math.min(MAX_LIMIT, Math.max(1, q.limit ?? 50));
    const after = q.cursor && /^\d+$/.test(q.cursor) ? Number(q.cursor) : -1;
    const rows = await db.dataJobItem.findMany({ where: { jobId: id, seq: { gt: after }, ...(q.only ? { status: q.only } : {}) }, orderBy: { seq: 'asc' }, take: limit + 1, select: { seq: true, targetId: true, status: true, error: true } });
    const page = rows.slice(0, limit);
    return { data: page.map((r) => ({ seq: r.seq, target_id: r.targetId, status: r.status as DataJobItemDto['status'], error: r.error })), next_cursor: rows.length > limit ? String(page.at(-1)!.seq) : null };
  }

  async download(v: Viewer, id: string): Promise<{ name: string; mime: string; body: Buffer }> {
    const { db, job } = await this.own(v, id);
    if (!this.storage || !(await this.downloadable(db, v.authz, job))) throw new AppError('INVALID_STATE', 410, { file: 'expired' });
    const name = job.fileName ?? 'export.csv';
    return { name, mime: name.endsWith('.xlsx') ? XLSX_MIME : 'text/csv; charset=utf-8', body: await this.storage.get(job.fileKey!) };
  }
}
