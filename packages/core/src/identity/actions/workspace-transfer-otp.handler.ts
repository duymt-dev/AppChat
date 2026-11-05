// workspace.request_transfer_otp (db platform, config, chỉ UI — TIP-045b annex A3): Owner hiện tại xin mã đổi chủ cho một thành viên
// active. Mã gửi email đã xác minh của Owner qua hiệu ứng bền sau commit; action_log / sổ thao tác không chứa mã (chỉ payload mã hoá).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, workspaceRequestTransferOtp } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { preview } from '../../kernel/actions/preview-kit';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { needPlatform, userName } from './previews/platform-read';
import { OTP_TTL_MS } from '../services/otp.service';
import { requestTransferOtp, TRANSFER_OTP_MAIL_EFFECT } from '../services/ownership-transfer';

type Input = ActionInput<typeof workspaceRequestTransferOtp>;
type Output = { sent_to: string; expires_at: string };

/** Đổi chủ chỉ do chính Owner bấm ở UI — Trợ lý / agent / tác vụ / API không xin hay nhận mã. */
export function ownerUiOnly(ctx: ActionContext): string {
  if (ctx.source !== 'ui' || ctx.actor.type !== 'user') throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  return ctx.actor.id;
}

@Injectable()
@ActionHandler('workspace.request_transfer_otp')
export class WorkspaceRequestTransferOtpHandler implements Handler<Input, Output> {
  constructor(
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Output>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'workspace.request_transfer_otp cần PlatformTx');
    const me = ownerUiOnly(ctx);
    const r = await requestTransferOtp(ptx, ctx.workspaceId, me, input.to_user_id, this.clock.now());
    return {
      result: { sent_to: r.sentTo, expires_at: r.expiresAt.toISOString() },
      after: { to_user_id: input.to_user_id, expires_at: r.expiresAt.toISOString() },
      effects: [{ kind: TRANSFER_OTP_MAIL_EFFECT, payload: { ...r.mail }, ttlMs: OTP_TTL_MS }],
    };
  }

  async preview(ctx: ActionContext, input: Input) {
    const u = await userName(needPlatform(this.platform, 'workspace.request_transfer_otp'), input.to_user_id);
    return preview('config', u.name);
  }
}
