// Yêu cầu đóng băng (TIP-041 §4, DC-245): Owner KHÔNG tự tạm dừng — gửi yêu cầu bền cho admin nền tảng; admin duyệt → tạm dừng qua đúng
// luật TIP-040 (CAS status_version, chỉ từ active, thế hệ workspace_status) trong CÙNG transaction đánh `approved` (không báo duyệt khi
// tạm dừng chưa xảy ra); từ chối → không đổi workspace. Workspace đã xoá / Owner đã đổi / requester mất quyền → yêu cầu `cancelled` có lý
// do. Một yêu cầu chờ mỗi workspace (partial unique). Owner đọc kết quả qua GET /v1/workspace/lifecycle.
import { Inject, Injectable } from '@nestjs/common';
import { WORKSPACE_STATUS_SCOPE, type PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { PlatformActionHandler, type AdminOutcome, type PlatformContext } from '../../kernel/actions/platform-context';
import { LifecycleActionHandler, type LifecycleContext, type LifecycleOutcome } from '../../kernel/actions/workspace-lifecycle-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import { bumpRevision } from '../../platform/public';

const isUnique = (e: unknown) => (e as { code?: string })?.code === 'P2002';

@Injectable()
@ActionHandler('workspace.freeze_request')
export class WorkspaceFreezeRequestHandler extends LifecycleActionHandler<{ reason: string }, { request_id: string; status: 'pending' }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {
    super();
  }

  async executeLifecycle(ctx: LifecycleContext, i: { reason: string }, ptx: PlatformTx): Promise<LifecycleOutcome<{ request_id: string; status: 'pending' }>> {
    const now = this.clock.now();
    const w = await ptx.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { ownerUserId: true, status: true, dbStatus: true } });
    if (!w || w.dbStatus === 'deleted' || w.dbStatus === 'deleting') throw new AppError('NOT_FOUND', 404, { workspace_id: 'not_found' });
    const m = await ptx.membership.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.actor.id, status: 'active' }, select: { userId: true } });
    if (!m || w.ownerUserId !== ctx.actor.id) throw new AppError('FORBIDDEN', 403, { owner: 'not_owner' });
    if (w.status === 'suspended') throw new AppError('INVALID_TRANSITION', 409, { status: 'suspended' });
    const id = uuidv7(now.getTime());
    try {
      await ptx.workspaceFreezeRequest.create({ data: { id, workspaceId: ctx.workspaceId, requestedBy: ctx.actor.id, reason: i.reason, createdAt: now, updatedAt: now } });
    } catch (e) {
      if (isUnique(e)) throw new AppError('CONFLICT', 409, { freeze_request: 'pending_exists' });
      throw e;
    }
    return { result: { request_id: id, status: 'pending' }, after: { request_id: id } };
  }
}

type DecideIn = { request_id: string; if_version: number; decision: 'approve' | 'reject'; reason: string };
type DecideOut = { request_id: string; status: 'approved' | 'rejected' | 'cancelled'; version: number };

@Injectable()
@ActionHandler('admin.workspace.freeze_decide')
export class AdminWorkspaceFreezeDecideHandler extends PlatformActionHandler<DecideIn, DecideOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {
    super();
  }

  async executePlatform(ctx: PlatformContext, i: DecideIn, ptx: PlatformTx): Promise<AdminOutcome<DecideOut>> {
    const now = this.clock.now();
    await ptx.$queryRaw`SELECT id FROM workspace_freeze_request WHERE id = ${i.request_id}::uuid FOR UPDATE`;
    const r = await ptx.workspaceFreezeRequest.findUnique({ where: { id: i.request_id } });
    if (!r) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
    if (r.version !== i.if_version) throw new AppError('CONFLICT', 409, { if_version: 'stale', current_version: String(r.version) });
    if (r.status !== 'pending') throw new AppError('INVALID_TRANSITION', 409, { status: r.status });
    await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${r.workspaceId}::uuid FOR UPDATE`;
    const w = await ptx.workspace.findUniqueOrThrow({ where: { id: r.workspaceId }, select: { ownerUserId: true, status: true, dbStatus: true, statusVersion: true } });
    const requester = await ptx.membership.findFirst({ where: { workspaceId: r.workspaceId, userId: r.requestedBy, status: 'active' }, select: { userId: true } });
    // Người gửi không còn là Owner / không còn thành viên / workspace đã xoá → yêu cầu huỷ (không đổi workspace).
    const cancelWhy = w.dbStatus === 'deleted' || w.dbStatus === 'deleting' ? 'workspace_deleted' : !requester || w.ownerUserId !== r.requestedBy ? 'requester_revoked' : null;
    const status = cancelWhy ? 'cancelled' : i.decision === 'approve' ? 'approved' : 'rejected';
    if (status === 'approved') {
      // Luật tạm dừng TIP-040: chỉ từ active + db active; CAS status_version.
      if (w.status !== 'active' || w.dbStatus !== 'active') throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus, status: w.status });
      const n = await ptx.workspace.updateMany({
        where: { id: r.workspaceId, statusVersion: w.statusVersion, status: 'active', dbStatus: 'active' },
        data: { status: 'suspended', dbStatus: 'suspended', suspendedAt: now, suspendReason: `freeze_request: ${i.reason}`.slice(0, 300), statusVersion: { increment: 1 } },
      });
      if (!n.count) throw new AppError('CONFLICT', 409, { workspace: 'stale' });
      await bumpRevision(ptx, WORKSPACE_STATUS_SCOPE, now);
    }
    await ptx.workspaceFreezeRequest.update({
      where: { id: r.id },
      data: { status, version: { increment: 1 }, decidedBy: ctx.actor.id, decisionReason: cancelWhy ?? i.reason, decidedAt: now, updatedAt: now },
    });
    return {
      result: { request_id: r.id, status, version: r.version + 1 },
      targetWorkspaceId: r.workspaceId,
      before: { status: r.status, workspace_status: w.status },
      after: { status, workspace_status: status === 'approved' ? 'suspended' : w.status },
    };
  }

  async previewPlatform(_ctx: PlatformContext, i: DecideIn, db: PlatformDb) {
    const r = await db.workspaceFreezeRequest.findUnique({ where: { id: i.request_id } });
    if (!r) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
    const w = await db.workspace.findUniqueOrThrow({ where: { id: r.workspaceId }, select: { name: true, status: true } });
    return {
      summary: `${w.name} → ${i.decision === 'approve' ? 'suspended' : w.status}`,
      risk: 'config' as const,
      changes: [{ entity: 'workspace_freeze_request', id: r.id, before: { status: r.status }, after: { status: i.decision === 'approve' ? 'approved' : 'rejected' } }],
      warnings: i.decision === 'approve' ? ['new_work_blocked'] : [],
    };
  }
}

export interface FreezeRequestRow {
  id: string;
  workspace_id: string;
  workspace_name: string;
  requested_by: string;
  reason: string;
  status: string;
  version: number;
  decision_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

/** Danh sách cho admin: IDs-first theo `(status, created_at desc, id desc)` rồi nối tên workspace. */
export async function listFreezeRequests(db: PlatformDb, o: { status: 'pending' | 'approved' | 'rejected' | 'cancelled'; limit: number; cursor?: { at: Date; id: string } }): Promise<{ rows: FreezeRequestRow[]; next: { at: Date; id: string } | null }> {
  const ids = await db.workspaceFreezeRequest.findMany({
    where: { status: o.status, ...(o.cursor ? { OR: [{ createdAt: { lt: o.cursor.at } }, { createdAt: o.cursor.at, id: { lt: o.cursor.id } }] } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: o.limit + 1,
    select: { id: true },
  });
  const page = ids.slice(0, o.limit).map((x) => x.id);
  const rows = await db.workspaceFreezeRequest.findMany({ where: { id: { in: page } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  const names = new Map((await db.workspace.findMany({ where: { id: { in: rows.map((r) => r.workspaceId) } }, select: { id: true, name: true } })).map((w) => [w.id, w.name]));
  const last = rows.at(-1);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      workspace_id: r.workspaceId,
      workspace_name: names.get(r.workspaceId) ?? '',
      requested_by: r.requestedBy,
      reason: r.reason,
      status: r.status,
      version: r.version,
      decision_reason: r.decisionReason,
      created_at: r.createdAt.toISOString(),
      decided_at: r.decidedAt?.toISOString() ?? null,
    })),
    next: ids.length > o.limit && last ? { at: last.createdAt, id: last.id } : null,
  };
}
