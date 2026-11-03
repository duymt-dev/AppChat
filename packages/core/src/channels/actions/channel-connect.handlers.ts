// Kết nối tài khoản kênh (REQ-B10 bước 2, Blueprint §3.4 channels): channel.zalo.start_login (thêm tài khoản Zalo cá nhân,
// QR qua worker) · channel.reconnect (quét lại khi hết phiên / lỗi). Job đăng nhập xếp SAU commit (afterCommit) — worker
// ROLE=channels chạy QR, phát WS `channel.zalo.qr` + ghi trạng thái cho `/settings/channels/:id/login`.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, serverMessages } from '@appchat/shared';
import type { ActionInput, channelReconnect, channelZaloStartLogin } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { QuotaService } from '../../billing/public';
import { ChannelAccounts, defaultSettings } from '../services/accounts.service';
import { ChannelControl } from '../services/control';
import { reconnectPreview, startLoginPreview } from './previews/channel-connect.handlers.preview';

const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

/** Hàng đợi login chưa có (thiếu Redis) → action không làm được gì thật: 501 thay vì tạo tài khoản treo. */
const need = <T>(x: T | null): T => {
  if (!x) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'channels chưa cấu hình (Redis / PlatformDb)');
  return x;
};

@Injectable()
@ActionHandler('channel.zalo.start_login')
export class ChannelZaloStartLoginHandler implements Handler<ActionInput<typeof channelZaloStartLogin>, { channel_account_id: string; qr: string }> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof channelZaloStartLogin>, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ channel_account_id: string; qr: string }>> {
    const accounts = need(this.accounts);
    const control = need(this.control);
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'channel.zalo.start_login cần PlatformTx');
    // Khoá workspace: hai lần thêm tài khoản song song không cùng lọt qua hạn mức gói (như member.invite).
    await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ctx.workspaceId}::uuid FOR UPDATE`;
    await new QuotaService(ptx).assert(ctx.workspaceId, 'channels', await accounts.countLive(tx));
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    const name = input.label?.trim() || serverMessages('vi').channels.name.zalo_personal;
    const row = await tx.channelAccount.create({
      data: { id, type: 'zalo_personal', name, status: 'connecting', settings: { ...defaultSettings() }, createdBy: userOf(ctx), createdAt: now, lastEventAt: now },
    });
    await accounts.route(ctx.workspaceId, row, 'connecting', ptx);
    return {
      // QR đến sau qua WS `channel.zalo.qr` / GET …/login (zca-js sinh QR mất vài giây) — `qr` là đường đọc trạng thái.
      result: { channel_account_id: id, qr: `/settings/channels/${id}/login` },
      after: { id, type: row.type, name },
      afterCommit: async () => {
        await control.startLogin({ ws: ctx.workspaceId, account_id: id, user_id: userOf(ctx) });
      },
    };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof channelZaloStartLogin>) {
    return startLoginPreview(input);
  }
}

@Injectable()
@ActionHandler('channel.reconnect')
export class ChannelReconnectHandler implements Handler<ActionInput<typeof channelReconnect>, { channel_account_id: string; status: string }> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof channelReconnect>, tx: TenantTx): Promise<HandlerOutcome<{ channel_account_id: string; status: string }>> {
    const accounts = need(this.accounts);
    const control = need(this.control);
    const row = await accounts.live(tx, input.channel_account_id);
    // Chỉ kênh đăng nhập QR có "quét lại"; Email (TIP-018) kết nối lại bằng form.
    if (row.type !== 'zalo_personal') throw new AppError('INVALID_STATE', 409, { type: row.type });
    const now = this.clock.now();
    await control.send({ op: 'stop', account_id: row.id });
    const { row: next, event } = await accounts.setStatus(tx, row, { status: 'connecting', pausedAt: null }, now);
    return {
      result: { channel_account_id: row.id, status: 'connecting' },
      before: { id: row.id, status: row.status },
      after: { id: row.id, status: next.status },
      events: event ? [event] : [],
      afterCommit: async () => {
        await accounts.route(ctx.workspaceId, next, 'connecting');
        await control.startLogin({ ws: ctx.workspaceId, account_id: row.id, user_id: userOf(ctx) });
      },
    };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof channelReconnect>, tx: TenantTx) {
    return reconnectPreview(need(this.accounts), tx, input);
  }
}
