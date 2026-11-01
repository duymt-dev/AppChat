// `channel.email.connect` (TIP-018, Blueprint §3.4 + §6): form IMAP / SMTP → đăng nhập thật → tài khoản email `connected`
// (credential AES-256-GCM, `external_id` = địa chỉ, route) dưới khoá workspace + hạn mức `max_channels` (DC-069). Worker ROLE=channels
// thấy route `connected` → nạp credential + poll 60 giây. Địa chỉ đang có tài khoản chưa ngắt → 409.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ChannelRegistry } from '@appchat/channels';
import { AppError, serverMessages } from '@appchat/shared';
import type { ActionInput, channelEmailConnect } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ENC_KEY, encryptSecret } from '../../kernel/crypto';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { QuotaService } from '../../billing/public';
import { CHANNEL_REGISTRY } from '../tokens';
import { ChannelAccounts, defaultSettings } from '../services/accounts.service';
import { ChannelControl } from '../services/control';
import { emailAdapterOf, emailCredentials, verifyMailbox } from './credentials';

const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

@Injectable()
@ActionHandler('channel.email.connect')
export class ChannelEmailConnectHandler implements Handler<ActionInput<typeof channelEmailConnect>, { channel_account_id: string }> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof channelEmailConnect>, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ channel_account_id: string }>> {
    const accounts = this.accounts;
    if (!accounts) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'channels chưa cấu hình (PlatformDb)');
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'channel.email.connect cần PlatformTx');
    const key = this.key;
    if (!key) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'channels chưa cấu hình (APP_ENC_KEY)');
    const creds = emailCredentials(input.address, input.fields);
    if (await tx.channelAccount.findFirst({ where: { type: 'email', externalId: creds.address, status: { not: 'disconnected' } }, select: { id: true } })) {
      throw new AppError('CONFLICT', 409, { address: 'exists' });
    }
    await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ctx.workspaceId}::uuid FOR UPDATE`;
    await new QuotaService(ptx).assert(ctx.workspaceId, 'channels', await accounts.countLive(tx));
    // Đăng nhập thật trước khi lưu — sai thì 422 kèm lý do (mã i18n), không tạo tài khoản.
    const v = await verifyMailbox(emailAdapterOf(this.registry), creds);
    if (!v.ok) throw new AppError('VALIDATION_FAILED', 422, { fields: v.reason }, serverMessages('vi').channels.email[v.reason as 'imap_auth']);

    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    const name = input.name?.trim() || creds.address;
    const row = await tx.channelAccount.create({
      data: {
        id,
        type: 'email',
        name,
        externalId: creds.address,
        status: 'connected',
        credentialsEnc: new Uint8Array(encryptSecret(JSON.stringify(creds), key)),
        settings: { ...defaultSettings(), hours: '24/7' },
        health: { status: 'connected', checked_at: now.toISOString() },
        createdBy: userOf(ctx),
        createdAt: now,
        lastEventAt: now,
      },
    });
    await accounts.route(ctx.workspaceId, row, 'connected', ptx);
    const control = this.control;
    return {
      result: { channel_account_id: id },
      // Không ghi credential vào log (action_log after): chỉ địa chỉ + máy chủ.
      after: { id, type: 'email', name, address: creds.address, imap_host: creds.imap_host, smtp_host: creds.smtp_host },
      events: [{ topic: 'channel.connected', payload: { channel_account_id: id, type: 'email', name } }],
      ...(control ? { afterCommit: () => control.send({ op: 'start', account_id: id }) } : {}),
    };
  }
}
