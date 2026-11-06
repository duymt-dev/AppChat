// admin.workspace.suspend / resume (TIP-040 pha 4, AC07, DC-373). Tạm dừng: status → suspended + db_status active → suspended (CHỈ từ
// active — không ghi đè archiving / restoring / deleting) + lý do, CAS `status_version`, tăng thế hệ `workspace_status` cùng transaction
// → resolver / cổng gửi / bước AI ở mọi tiến trình thấy trong ≤ 2 giây. Mở lại: chỉ từ suspended + DB tenant kiểm SẴN SÀNG (SELECT 1
// qua kết nối thật, ngoài transaction) — không dùng để khôi phục workspace đã lưu trữ (TIP-041). Không xoá / không đụng dữ liệu.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { createTenantDb, withDatabase, WORKSPACE_STATUS_SCOPE, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, adminWorkspaceResume, adminWorkspaceSuspend } from '@appchat/actions';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { PlatformActionHandler, type AdminOutcome, type PlatformContext } from '../../kernel/actions/platform-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { DB_ENV, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { DbEnv } from '@appchat/db';
import { bumpRevision } from '../services/config-revision';
import { casConflict } from '../services/config-validation';

type SuspendIn = ActionInput<typeof adminWorkspaceSuspend>;
type ResumeIn = ActionInput<typeof adminWorkspaceResume>;
type Ws = NonNullable<Awaited<ReturnType<PlatformDb['workspace']['findUnique']>>>;
const state = (w: Pick<Ws, 'status' | 'dbStatus' | 'statusVersion'>) => ({ status: w.status, db_status: w.dbStatus, version: w.statusVersion });

async function load(db: Pick<PlatformDb, 'workspace'>, id: string) {
  const w = await db.workspace.findUnique({ where: { id } });
  if (!w) throw new AppError('NOT_FOUND', 404, { workspace_id: 'not_found' });
  return w;
}

@Injectable()
@ActionHandler('admin.workspace.suspend')
export class AdminWorkspaceSuspendHandler extends PlatformActionHandler<SuspendIn, { workspace_id: string; status: 'suspended'; version: number }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null = null,
  ) {
    super();
  }

  async executePlatform(_ctx: PlatformContext, i: SuspendIn, ptx: PlatformTx): Promise<AdminOutcome<{ workspace_id: string; status: 'suspended'; version: number }>> {
    const now = this.clock.now();
    const w = await load(ptx, i.workspace_id);
    if (w.statusVersion !== i.if_version) throw casConflict(w.statusVersion);
    if (w.status !== 'active' || w.dbStatus !== 'active') throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus, status: w.status });
    const n = await ptx.workspace.updateMany({
      where: { id: w.id, statusVersion: w.statusVersion, status: 'active', dbStatus: 'active' },
      data: { status: 'suspended', dbStatus: 'suspended', suspendedAt: now, suspendReason: i.reason, statusVersion: { increment: 1 } },
    });
    if (!n.count) throw casConflict(w.statusVersion);
    await bumpRevision(ptx, WORKSPACE_STATUS_SCOPE, now);
    return {
      result: { workspace_id: w.id, status: 'suspended', version: w.statusVersion + 1 },
      targetWorkspaceId: w.id,
      before: state(w),
      after: { status: 'suspended', db_status: 'suspended', version: w.statusVersion + 1, reason: i.reason },
      // Tiến trình này chặn ngay (tiến trình khác theo thế hệ ≤ 2 giây).
      afterCommit: async () => this.tenants?.invalidate(w.id),
    };
  }

  async previewPlatform(_ctx: PlatformContext, i: SuspendIn, db: PlatformDb) {
    const w = await load(db, i.workspace_id);
    if (w.status !== 'active' || w.dbStatus !== 'active') throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus, status: w.status });
    return {
      summary: `${w.name} → suspended`,
      risk: 'config' as const,
      changes: [{ entity: 'workspace', id: w.id, before: state(w), after: { status: 'suspended', db_status: 'suspended' } }],
      warnings: ['new_work_blocked', 'sent_not_recalled'],
    };
  }
}

@Injectable()
@ActionHandler('admin.workspace.resume')
export class AdminWorkspaceResumeHandler extends PlatformActionHandler<ResumeIn, { workspace_id: string; status: 'active'; version: number }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(DB_ENV) private readonly env: DbEnv | null = null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null = null,
  ) {
    super();
  }

  /** DB tenant phải trả lời thật (kết nối riêng, không qua resolver đang chặn) — ngoài transaction. */
  override async prepare(_ctx: PlatformContext, i: ResumeIn, db: PlatformDb): Promise<void> {
    const w = await load(db, i.workspace_id);
    if (w.statusVersion !== i.if_version) throw casConflict(w.statusVersion);
    if (w.status !== 'suspended' || w.dbStatus !== 'suspended') throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus, status: w.status });
    // Ứng dụng dựng không có DB (test khởi động / health) → không xác minh được DB tenant → không mở lại.
    if (!this.env) throw new AppError('WORKSPACE_UNAVAILABLE', 503, { db: 'not_configured' });
    const t = createTenantDb(withDatabase(this.env.TENANT_DATABASE_URL, w.dbName, w.dbHost), 1);
    try {
      await t.$queryRaw`SELECT 1`;
    } catch {
      throw new AppError('WORKSPACE_UNAVAILABLE', 503, { db: 'not_ready' });
    } finally {
      await t.$disconnect();
    }
  }

  async executePlatform(_ctx: PlatformContext, i: ResumeIn, ptx: PlatformTx): Promise<AdminOutcome<{ workspace_id: string; status: 'active'; version: number }>> {
    const now = this.clock.now();
    const w = await load(ptx, i.workspace_id);
    const n = await ptx.workspace.updateMany({
      where: { id: w.id, statusVersion: i.if_version, status: 'suspended', dbStatus: 'suspended' },
      data: { status: 'active', dbStatus: 'active', suspendedAt: null, suspendReason: null, statusVersion: { increment: 1 } },
    });
    if (!n.count) throw w.statusVersion !== i.if_version ? casConflict(w.statusVersion) : new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus });
    await bumpRevision(ptx, WORKSPACE_STATUS_SCOPE, now);
    return { result: { workspace_id: w.id, status: 'active', version: w.statusVersion + 1 }, targetWorkspaceId: w.id, before: { ...state(w), reason: w.suspendReason }, after: { status: 'active', db_status: 'active', version: w.statusVersion + 1 }, afterCommit: async () => this.tenants?.invalidate(w.id) };
  }

  async previewPlatform(_ctx: PlatformContext, i: ResumeIn, db: PlatformDb) {
    const w = await load(db, i.workspace_id);
    if (w.status !== 'suspended' || w.dbStatus !== 'suspended') throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus, status: w.status });
    return { summary: `${w.name} → active`, risk: 'config' as const, changes: [{ entity: 'workspace', id: w.id, before: state(w), after: { status: 'active', db_status: 'active' } }], warnings: ['held_messages_resume'] };
  }
}
