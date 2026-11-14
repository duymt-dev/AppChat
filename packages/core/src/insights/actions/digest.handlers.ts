// digest.dispatch (TIP-038 pha 4, DC-366) — system-only: chỉ scheduler `insights.digest` (actor `system:digest`, nguồn system). Mọi ghi sổ
// email tóm tắt đi qua ActionExecutor (action_log). `send`: giành dòng (`queued → sending`) trong transaction của action, gọi nhà cung cấp
// SAU commit (afterCommit) rồi ghi kết quả bằng CAS riêng — rollback không bao giờ đưa dòng đã gửi về `queued`. Preview → 403.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, digestDispatch } from '@appchat/actions';
import type { MailProvider } from '@appchat/integrations';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import {
  ActionHandler,
  type ActionHandler as Handler,
  type HandlerOutcome,
} from '../../kernel/actions/handler';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { AuthzResolver } from '../../authz/services/authz-resolver';
import { claimDigests, deliverDigests, planDigests, type DigestDeps } from '../jobs/digest.service';

export const DIGEST_ACTOR = 'system:digest';
/** Phụ thuộc gửi mail (worker ROLE=jobs đặt khi có MailProvider) — API không gửi digest. */
export const DIGEST_MAIL = Symbol('DIGEST_MAIL');
export interface DigestMail {
  mail: MailProvider;
  publicUrl: string;
}

type Out = { planned: number; sent: number; skipped: number; unknown: number; failed: number };

@Injectable()
@ActionHandler('digest.dispatch')
export class DigestDispatchHandler implements Handler<ActionInput<typeof digestDispatch>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb,
    @Optional() @Inject(AuthzResolver) private readonly authz?: AuthzResolver,
    @Optional() @Inject(DIGEST_MAIL) private readonly mail?: DigestMail | null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants?: TenantDbResolver,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: 'system_only' });
  }

  async execute(
    ctx: ActionContext,
    input: ActionInput<typeof digestDispatch>,
    tx: TenantTx,
  ): Promise<HandlerOutcome<Out>> {
    if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== DIGEST_ACTOR)
      throw new AppError('FORBIDDEN', 403, { source: ctx.source });
    if (!this.platform || !this.authz)
      throw new AppError('NOT_IMPLEMENTED', 503, { platform: 'unavailable' });
    const platform = this.platform;
    const authz = this.authz;
    const deps = (db: TenantTx): DigestDeps => ({
      platform,
      db,
      mail: this.mail?.mail ?? null,
      publicUrl: this.mail?.publicUrl ?? '',
      now: () => this.clock.now(),
      authzOf: async (ws, userId) => {
        const m = await platform.membership.findFirst({
          where: { workspaceId: ws, userId, status: 'active' },
          select: { roleKey: true, delegations: true },
        });
        return m ? authz.resolve(ws, userId, m) : null;
      },
    });
    // plan: chỉ ghi sổ (insert bỏ trùng) — trong transaction của action.
    if (input.step === 'plan') return { result: await planDigests(deps(tx), ctx.workspaceId) };
    // send: giành trong transaction; gửi sau commit (kết quả `sent` = số dòng đã giành để gửi — trạng thái cuối nằm ở sổ).
    const { claimed, ...counts } = await claimDigests(deps(tx), ctx.workspaceId);
    const mail = this.mail?.mail;
    const tenants = this.tenants;
    return {
      result: { ...counts, sent: claimed.length },
      ...(claimed.length && mail && tenants
        ? {
            afterCommit: async () =>
              void (await deliverDigests(
                await tenants.get(TenantContexts.system(ctx.workspaceId, 'digest')),
                mail,
                claimed,
                () => this.clock.now(),
              )),
          }
        : {}),
    };
  }
}
