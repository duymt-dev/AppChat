// workspace.open (TIP-041 §1 / §3): thành viên còn hiệu lực mở workspace → mốc hoạt động của CHÍNH workspace này (GREATEST) và, nếu đã lưu
// trữ, tạo lệnh khôi phục (nguồn `member`) trong cùng transaction nền tảng. Nhiều thành viên mở cùng lúc → gộp vào lệnh đang chờ / chạy
// (partial unique một lệnh active / workspace). Tạm dừng / đang xoá / đang lưu trữ → không tự mở / khôi phục (chỉ trả trạng thái).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { LifecycleActionHandler, type LifecycleContext, type LifecycleOutcome } from '../../kernel/actions/workspace-lifecycle-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { touchActivity } from './activity';
import { createLifecycleJob } from './jobs';
import { LIFECYCLE_QUEUE, type LifecycleWake } from './types';

type Out = { workspace_id: string; db_status: string; restore_job_id: string | null };

@Injectable()
@ActionHandler('workspace.open')
export class WorkspaceOpenHandler extends LifecycleActionHandler<Record<string, never>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(LIFECYCLE_QUEUE) private readonly wake: LifecycleWake | null = null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null = null,
  ) {
    super();
  }

  async executeLifecycle(ctx: LifecycleContext, _i: Record<string, never>, ptx: PlatformTx): Promise<LifecycleOutcome<Out>> {
    const now = this.clock.now();
    // Membership kiểm lại trong transaction (thu hồi giữa lúc xác thực và lúc ghi → 403, không ghi hoạt động).
    const m = await ptx.membership.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.actor.id, status: 'active' }, select: { userId: true } });
    if (!m) throw new AppError('FORBIDDEN', 403, { workspace: 'not_member' });
    let w = await ptx.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { status: true, dbStatus: true } });
    // Đã lưu trữ: khoá dòng workspace rồi đọc lại — thành viên mở đồng thời chờ nhau, người sau thấy `restoring` và gộp vào lệnh đã tạo.
    if (w?.dbStatus === 'archived') {
      await ptx.$queryRaw`SELECT 1 FROM "workspace" WHERE "id" = ${ctx.workspaceId}::uuid FOR UPDATE`;
      w = await ptx.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { status: true, dbStatus: true } });
    }
    if (!w) throw new AppError('NOT_FOUND', 404, { workspace_id: 'not_found' });
    if (w.status !== 'active') return { result: { workspace_id: ctx.workspaceId, db_status: w.dbStatus, restore_job_id: null } };
    await touchActivity(ptx, ctx.workspaceId, now);
    if (w.dbStatus === 'restoring') {
      const j = await ptx.workspaceLifecycleJob.findFirst({ where: { workspaceId: ctx.workspaceId, operation: 'restore', status: { in: ['pending', 'running'] } }, select: { id: true } });
      return { result: { workspace_id: ctx.workspaceId, db_status: 'restoring', restore_job_id: j?.id ?? null } };
    }
    if (w.dbStatus !== 'archived') return { result: { workspace_id: ctx.workspaceId, db_status: w.dbStatus, restore_job_id: null } };
    const j = await createLifecycleJob(ptx, { workspaceId: ctx.workspaceId, op: 'restore', expectedVersion: null, source: 'member', requestedBy: ctx.actor.id, now });
    return {
      result: { workspace_id: ctx.workspaceId, db_status: 'restoring', restore_job_id: j.id },
      after: { restore_job_id: j.id, generation: j.generation },
      afterCommit: async () => {
        this.tenants?.invalidate(ctx.workspaceId);
        await this.wake?.wake(j.id).catch(() => undefined);
      },
    };
  }
}
