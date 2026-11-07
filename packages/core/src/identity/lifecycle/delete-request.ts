// workspace.delete_challenge / workspace.delete (TIP-041 §4, DC-245, DC-376): Owner xoá workspace.
//   - ĐÚNG Owner: đọc `workspace.owner_user_id` (khoá dòng) trong transaction nền tảng — không theo vai trò / quyền uỷ; admin nền tảng không
//     xoá thay bằng action này. Chỉ nguồn UI (ngữ cảnh lifecycle đã chặn Trợ lý / agent / GenUI).
//   - challenge: gõ lại đúng tên workspace → bản xem trước + băm → thử thách OTP (step-up.ts) → thư mã là hiệu ứng bền (mã hoá, sau commit).
//   - delete: tính lại bản xem trước → tiêu thử thách (băm + phiên bản phải khớp, sai mã đếm ở transaction riêng) → lệnh bền `delete`
//     (CAS → deleting, resolver mọi tiến trình chặn) → worker: sao lưu mã hoá giữ 30 ngày → DROP → tombstone. Không hoàn tiền tự động.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { LifecycleActionHandler, type LifecycleContext, type LifecycleOutcome } from '../../kernel/actions/workspace-lifecycle-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ENC_KEY } from '../../kernel/crypto';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { TenantDbResolver } from '@appchat/db';
import { maskEmail } from '../services/ownership-transfer';
import { DELETION_RETENTION_DAYS, deletePreview, sameName } from './delete-preview';
import { createLifecycleJob } from './jobs';
import { consumeStepUp, issueStepUp, STEP_UP_TTL_MS } from './step-up';
import { LIFECYCLE_QUEUE, type LifecycleWake } from './types';

export const DELETE_OTP_MAIL_EFFECT = 'identity.delete_otp_mail';
export interface DeleteOtpMail {
  to: string;
  locale: string;
  code: string;
  workspace: string;
}

/** Khoá dòng workspace + kiểm người gọi là Owner hiện tại và còn membership active. */
async function lockOwner(ptx: PlatformTx, ctx: LifecycleContext) {
  await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ctx.workspaceId}::uuid FOR UPDATE`;
  const w = await ptx.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { ownerUserId: true, name: true } });
  if (!w) throw new AppError('NOT_FOUND', 404, { workspace_id: 'not_found' });
  const m = await ptx.membership.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.actor.id, status: 'active' }, select: { userId: true } });
  if (!m || w.ownerUserId !== ctx.actor.id) throw new AppError('FORBIDDEN', 403, { owner: 'not_owner' });
  return w;
}

const needKey = (k: Buffer | null) => {
  if (!k) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'workspace.delete cần APP_ENC_KEY');
  return k;
};

@Injectable()
@ActionHandler('workspace.delete_challenge')
export class WorkspaceDeleteChallengeHandler extends LifecycleActionHandler<{ confirm_name: string }, { challenge_id: string; sent_to: string; expires_at: string; preview_hash: string }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | null = null,
  ) {
    super();
  }

  async executeLifecycle(ctx: LifecycleContext, i: { confirm_name: string }, ptx: PlatformTx) {
    const key = needKey(this.key);
    const now = this.clock.now();
    const w = await lockOwner(ptx, ctx);
    if (!sameName(i.confirm_name, w.name)) throw new AppError('VALIDATION_FAILED', 422, { confirm_name: 'mismatch' });
    const { preview, hash } = await deletePreview(ptx, ctx.workspaceId, now);
    const owner = await ptx.user.findUniqueOrThrow({ where: { id: ctx.actor.id }, select: { email: true, locale: true, emailVerifiedAt: true } });
    if (!owner.emailVerifiedAt) throw new AppError('VALIDATION_FAILED', 422, { email: 'unverified' });
    const c = await issueStepUp(ptx, key, { workspaceId: ctx.workspaceId, userId: ctx.actor.id, operation: 'delete_workspace', previewHash: hash, expectedVersion: preview.status_version, now });
    const mail: DeleteOtpMail = { to: owner.email, locale: owner.locale, code: c.code, workspace: w.name };
    return {
      result: { challenge_id: c.id, sent_to: maskEmail(owner.email), expires_at: c.expiresAt.toISOString(), preview_hash: hash },
      after: { challenge_id: c.id, preview },
      effects: [{ kind: DELETE_OTP_MAIL_EFFECT, payload: { ...mail }, ttlMs: STEP_UP_TTL_MS }],
    } satisfies LifecycleOutcome<unknown>;
  }
}

type DeleteIn = { challenge_id: string; otp: string; acknowledge_loss: true };
type DeleteOut = { workspace_id: string; job_id: string; db_status: 'deleting'; backup_expires_on: string };

@Injectable()
@ActionHandler('workspace.delete')
export class WorkspaceDeleteHandler extends LifecycleActionHandler<DeleteIn, DeleteOut> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | null = null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | null = null,
    @Optional() @Inject(LIFECYCLE_QUEUE) private readonly wake: LifecycleWake | null = null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null = null,
  ) {
    super();
  }

  async executeLifecycle(ctx: LifecycleContext, i: DeleteIn, ptx: PlatformTx): Promise<LifecycleOutcome<DeleteOut>> {
    const key = needKey(this.key);
    const now = this.clock.now();
    await lockOwner(ptx, ctx);
    const { preview, hash } = await deletePreview(ptx, ctx.workspaceId, now);
    const db = this.platform;
    await consumeStepUp(
      ptx,
      key,
      { challengeId: i.challenge_id, workspaceId: ctx.workspaceId, userId: ctx.actor.id, operation: 'delete_workspace', previewHash: hash, currentVersion: preview.status_version, code: i.otp, now },
      async (id) => void (await db?.workspaceStepUp.update({ where: { id }, data: { attempts: { increment: 1 } } })),
    );
    const j = await createLifecycleJob(ptx, { workspaceId: ctx.workspaceId, op: 'delete', expectedVersion: preview.status_version, source: 'owner', requestedBy: ctx.actor.id, now });
    const expires = new Date(now.getTime() + DELETION_RETENTION_DAYS * 86_400_000);
    return {
      result: { workspace_id: ctx.workspaceId, job_id: j.id, db_status: 'deleting', backup_expires_on: expires.toISOString().slice(0, 10) },
      after: { job_id: j.id, generation: j.generation, from: preview.db_status, paid_days_left: preview.paid_days_left, topup_credits: preview.topup_credits },
      afterCommit: async () => {
        this.tenants?.invalidate(ctx.workspaceId);
        await this.wake?.wake(j.id).catch(() => undefined);
      },
    };
  }
}
