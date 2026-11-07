// admin.workspace.archive / restore (TIP-041, Blueprint §2.0 bước 5): handler nền tảng — chỉ TẠO lệnh bền (CAS phiên bản + thế hệ +
// db_status trung gian) trong transaction của executor (audit + biên nhận admin cùng commit); việc dump / restore chạy ở worker ROLE=jobs
// (dispatcher queue `tenant`). Luôn xem trước (`PLATFORM_ALWAYS_PREVIEW` của executor). Sau commit: đánh thức worker + bỏ cache registry tiến trình này.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import type { ActionInput, adminWorkspaceArchive, adminWorkspaceRestore } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { PlatformActionHandler, type AdminOutcome, type PlatformContext } from '../../kernel/actions/platform-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { createLifecycleJob } from './jobs';
import { LIFECYCLE_QUEUE, type LifecycleWake } from './types';

type ArchiveIn = ActionInput<typeof adminWorkspaceArchive>;
type RestoreIn = ActionInput<typeof adminWorkspaceRestore>;
type Out = { workspace_id: string; job_id: string; generation: number; status: 'pending'; version: number };

async function load(db: Pick<PlatformDb, 'workspace'>, id: string) {
  const w = await db.workspace.findUnique({ where: { id }, select: { id: true, name: true, status: true, dbStatus: true, statusVersion: true, archivedAt: true } });
  if (!w) throw new AppError('NOT_FOUND', 404, { workspace_id: 'not_found' });
  return w;
}

abstract class LifecycleHandler<I extends { workspace_id: string; if_version: number }> extends PlatformActionHandler<I, Out> {
  protected abstract readonly op: 'archive' | 'restore';

  constructor(
    protected readonly clock: Clock,
    protected readonly wake: LifecycleWake | null,
    protected readonly tenants: TenantDbResolver | null,
  ) {
    super();
  }

  async executePlatform(ctx: PlatformContext, i: I, ptx: PlatformTx): Promise<AdminOutcome<Out>> {
    const before = await load(ptx, i.workspace_id);
    const j = await createLifecycleJob(ptx, { workspaceId: i.workspace_id, op: this.op, expectedVersion: i.if_version, source: 'admin', requestedBy: ctx.actor.id, now: this.clock.now() });
    return {
      result: { workspace_id: i.workspace_id, job_id: j.id, generation: j.generation, status: 'pending', version: j.version },
      targetWorkspaceId: i.workspace_id,
      before: { db_status: before.dbStatus, version: before.statusVersion },
      after: { db_status: this.op === 'archive' ? 'archiving' : 'restoring', version: j.version, job_id: j.id, generation: j.generation, ...('reason' in i ? { reason: (i as { reason: string }).reason } : {}) },
      afterCommit: async () => {
        this.tenants?.invalidate(i.workspace_id);
        // Đánh thức chỉ là tín hiệu — lệnh bền ở `workspace_lifecycle_job`; lỗi Redis → quét định kỳ của worker nhặt lại.
        await this.wake?.wake(j.id).catch(() => undefined);
      },
    };
  }
}

@Injectable()
@ActionHandler('admin.workspace.archive')
export class AdminWorkspaceArchiveHandler extends LifecycleHandler<ArchiveIn> {
  protected readonly op = 'archive' as const;

  constructor(@Inject(CLOCK) clock: Clock, @Optional() @Inject(LIFECYCLE_QUEUE) wake: LifecycleWake | null = null, @Optional() @Inject(TENANT_RESOLVER) tenants: TenantDbResolver | null = null) {
    super(clock, wake, tenants);
  }

  async previewPlatform(_ctx: PlatformContext, i: ArchiveIn, db: PlatformDb) {
    const w = await load(db, i.workspace_id);
    if (w.status !== 'active' || w.dbStatus !== 'active') throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus, status: w.status });
    const stats = await db.workspaceStats.findUnique({ where: { workspaceId: w.id }, select: { dbSizeBytes: true, lastActiveAt: true } });
    return {
      summary: `${w.name} → archived`,
      risk: 'config' as const,
      changes: [{ entity: 'workspace', id: w.id, before: { db_status: w.dbStatus }, after: { db_status: 'archived', db_size_bytes: stats ? String(stats.dbSizeBytes) : null, last_active_at: stats?.lastActiveAt?.toISOString() ?? null } }],
      // Kênh ngắt (Zalo có thể phải quét QR lại khi khôi phục); dữ liệu giữ trong bản mã hoá tới khi khôi phục / xoá.
      warnings: ['channels_disconnected', 'database_dropped_after_verified_backup', 'restore_on_member_open'],
    };
  }
}

@Injectable()
@ActionHandler('admin.workspace.restore')
export class AdminWorkspaceRestoreHandler extends LifecycleHandler<RestoreIn> {
  protected readonly op = 'restore' as const;

  constructor(@Inject(CLOCK) clock: Clock, @Optional() @Inject(LIFECYCLE_QUEUE) wake: LifecycleWake | null = null, @Optional() @Inject(TENANT_RESOLVER) tenants: TenantDbResolver | null = null) {
    super(clock, wake, tenants);
  }

  async previewPlatform(_ctx: PlatformContext, i: RestoreIn, db: PlatformDb) {
    const w = await load(db, i.workspace_id);
    if (w.status !== 'active' || w.dbStatus !== 'archived') throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus, status: w.status });
    const m = await db.archiveManifest.findFirst({ where: { workspaceId: w.id, purgedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, createdAt: true, sizeBytes: true, schemaVersion: true } });
    if (!m) throw new AppError('INVALID_TRANSITION', 409, { archive: 'missing' });
    return {
      summary: `${w.name} → active`,
      risk: 'config' as const,
      changes: [{ entity: 'workspace', id: w.id, before: { db_status: 'archived', archived_at: w.archivedAt?.toISOString() ?? null }, after: { db_status: 'active', archive_id: m.id, archive_created_at: m.createdAt.toISOString(), size_bytes: String(m.sizeBytes) } }],
      warnings: ['schema_migrated_to_current', 'channels_may_need_qr'],
    };
  }
}
