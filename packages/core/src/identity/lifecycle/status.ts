// Đọc trạng thái vòng đời cho thành viên (TIP-041 §3, `GET /v1/workspace/lifecycle`): chỉ DB nền tảng — KHÔNG mở DB tenant (workspace
// đã lưu trữ không có DB). Membership còn hiệu lực kiểm ở đây (không qua AuthzResolver vì resolver cần DB tenant). Trả bước / mã lỗi đã
// che; cảnh báo lưu trữ chỉ hiện khi biên nhận thuộc cửa sổ của mốc hoạt động HIỆN TẠI (hoạt động mới → cảnh báo cũ hết hiệu lực).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError, type WorkspaceLifecycleDto } from '@appchat/shared';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';

type Job = NonNullable<WorkspaceLifecycleDto['job']>;

@Injectable()
export class WorkspaceLifecycleReader {
  constructor(
    @Optional() @Inject(PLATFORM_DB) private readonly db: PlatformDb | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async status(userId: string, workspaceId: string): Promise<WorkspaceLifecycleDto> {
    if (!this.db) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
    const db = this.db;
    const m = await db.membership.findFirst({ where: { workspaceId, userId, status: 'active' }, select: { userId: true } });
    if (!m) throw new AppError('FORBIDDEN', 403, { workspace: 'not_member' });
    const [w, job, stats] = await Promise.all([
      db.workspace.findUnique({ where: { id: workspaceId }, select: { dbStatus: true } }),
      db.workspaceLifecycleJob.findFirst({
        where: { workspaceId },
        orderBy: { generation: 'desc' },
        select: { id: true, operation: true, status: true, step: true, attempts: true, error: true },
      }),
      db.workspaceStats.findUnique({ where: { workspaceId }, select: { lastActiveAt: true } }),
    ]);
    if (!w) throw new AppError('NOT_FOUND', 404, { workspace_id: 'not_found' });
    const notice = stats?.lastActiveAt
      ? await db.workspaceLifecycleNotice.findUnique({
          where: { workspaceId_windowKey_channel: { workspaceId, windowKey: stats.lastActiveAt.toISOString(), channel: 'in_app' } },
          select: { status: true, archiveOn: true },
        })
      : null;
    const warn = w.dbStatus === 'active' && notice?.status === 'sent' && notice.archiveOn.getTime() > this.clock.now().getTime();
    return {
      workspace_id: workspaceId,
      db_status: w.dbStatus as WorkspaceLifecycleDto['db_status'],
      job: job ? { ...job, operation: job.operation as Job['operation'], status: job.status as Job['status'] } : null,
      archive_on: warn ? notice!.archiveOn.toISOString().slice(0, 10) : null,
    };
  }
}
