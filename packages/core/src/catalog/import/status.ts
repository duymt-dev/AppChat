// Phụ thuộc + đọc trạng thái lần nhập sản phẩm (TIP-032b): `ImportDeps` (tenant DB, FilesService, kiểm quyền người gọi lúc chạy, chạy
// ngay sau commit cho ≤ 500 dòng) dùng chung handler + worker; `ImportStatusService` cho `GET /v1/product-imports/:id` (+ `/rows`,
// `/errors` phân trang page + limit). Chỉ người gọi (hoặc Owner) xem được lần nhập của mình — người khác 404 như không có. Đọc không xếp
// việc / không chạy lại (polling an toàn). Trang dòng: deferred join theo PK (import_id, row_no) — chỉ đọc đúng trang.
import type { PlatformDb, TenantDb, TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import { AppError, can, type AuthzContext, type ProductImportRow, type ProductImportStatus } from '@appchat/shared';
import type { AuthzResolver } from '../../authz/services/authz-resolver';
import type { FilesService } from '../../kernel/files/files.service';
import { runImport } from './processor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 100;

export class ImportDeps {
  constructor(
    private readonly r: TenantDbResolver | null,
    private readonly f: FilesService | null,
    private readonly platform: PlatformDb | null,
    private readonly authz: AuthzResolver | null,
    readonly now: () => Date,
  ) {}

  tenants(): TenantDbResolver {
    if (!this.r) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'TenantDbResolver chưa cấu hình');
    return this.r;
  }

  files(): FilesService {
    if (!this.f) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'FilesService chưa cấu hình');
    return this.f;
  }

  /** Người gọi còn là thành viên hoạt động có `catalog.manage` (kiểm lại ngay trước khi ghi ở worker). */
  async canWrite(ws: string, actorId: string | null): Promise<boolean> {
    if (!actorId || !this.platform || !this.authz) return false;
    const m = await this.platform.membership.findFirst({ where: { workspaceId: ws, userId: actorId, status: 'active' }, select: { roleKey: true, delegations: true } });
    return !!m && can(await this.authz.resolve(ws, actorId, m), 'catalog.manage');
  }

  async run(ws: string, importId: string) {
    const db = await this.tenants().get(TenantContexts.system(ws, 'product.import'));
    return runImport(db, ws, importId, {
      readFile: async (id) => {
        const f = await this.files().read(db, id);
        return f ? { name: f.row.name, mime: f.row.mime, body: f.body } : null;
      },
      canWrite: (actor) => this.canWrite(ws, actor),
      now: this.now,
    });
  }

  /** ≤ 500 dòng: chạy ngay sau commit của action (lỗi không đổi kết quả đã commit — lần nhập ở trạng thái queued, chạy lại được). */
  async runNow(ws: string, importId: string) {
    await this.run(ws, importId);
  }
}

type Viewer = { workspaceId: string; userId: string; authz: AuthzContext };

export class ImportStatusService {
  constructor(private readonly d: ImportDeps) {}

  private async own(v: Viewer, id: string): Promise<TenantDb> {
    if (!can(v.authz, 'catalog.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'catalog.manage' });
    const db = await this.d.tenants().get(TenantContexts.system(v.workspaceId, 'product.import.read'));
    const imp = UUID.test(id) ? await db.productImport.findUnique({ where: { id }, select: { actorId: true } }) : null;
    if (!imp || (!v.authz.isOwner && imp.actorId !== v.userId)) throw new AppError('NOT_FOUND', 404, { import_id: 'not_found' });
    return db;
  }

  async status(v: Viewer, id: string): Promise<ProductImportStatus> {
    const db = await this.own(v, id);
    const i = await db.productImport.findUniqueOrThrow({ where: { id } });
    const done = await db.productImportRow.count({ where: { importId: id } });
    return {
      id: i.id,
      status: i.status as ProductImportStatus['status'],
      file_name: i.fileName,
      total: i.total,
      processed: done,
      created: i.created,
      updated: i.updated,
      failed: i.failed,
      error: i.error,
      created_at: i.createdAt.toISOString(),
      finished_at: i.finishedAt?.toISOString() ?? null,
    };
  }

  /** Trang biên nhận dòng (`only = 'failed'` cho file lỗi). Deferred join: chọn khoá trang trước rồi đọc đúng các dòng đó. */
  async rows(v: Viewer, id: string, q: { page?: number; limit?: number; only?: 'failed' }) {
    const db = await this.own(v, id);
    const limit = Math.min(MAX_LIMIT, Math.max(1, q.limit ?? 50));
    const page = Math.max(1, q.page ?? 1);
    const where = { importId: id, ...(q.only ? { status: q.only } : {}) };
    const [total, keys] = await Promise.all([
      db.productImportRow.count({ where }),
      db.productImportRow.findMany({ where, orderBy: { rowNo: 'asc' }, skip: (page - 1) * limit, take: limit, select: { rowNo: true } }),
    ]);
    const rows = keys.length ? await db.productImportRow.findMany({ where: { importId: id, rowNo: { in: keys.map((k) => k.rowNo) } }, orderBy: { rowNo: 'asc' } }) : [];
    return {
      data: rows.map((r): ProductImportRow => ({ row_no: r.rowNo, status: r.status as ProductImportRow['status'], product_id: r.productId, error: r.error })),
      meta: { total, page, limit },
      next_cursor: page * limit < total ? String(page + 1) : null,
    };
  }
}
