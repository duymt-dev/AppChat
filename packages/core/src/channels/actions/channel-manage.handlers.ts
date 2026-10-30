// Quản lý tài khoản kênh (REQ-B11 drawer, Blueprint §3.4): update_settings · pause / resume · sync_history · test · disconnect.
// Lệnh tới phiên đang chạy (dừng / chạy lại / đồng bộ) gửi SAU commit qua ChannelControl; route DB nền tảng đồng bộ cùng lúc.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, serverMessages } from '@appchat/shared';
import { channelRegistry } from '@appchat/channels';
import type { ActionInput, channelDisconnect, channelPause, channelResume, channelSyncHistory, channelTest, channelUpdateSettings } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { ChannelAccounts, routeStatusOf, settingsOf, type AccountRow, type AccountStatus, type AccountSettings } from '../services/accounts.service';
import { ChannelControl } from '../services/control';

type Ok = { ok: boolean };

const need = <T>(x: T | null): T => {
  if (!x) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'channels chưa cấu hình (Redis / PlatformDb)');
  return x;
};

/** Sau commit: route theo trạng thái mới + lệnh cho worker (nếu có). */
const sync = (accounts: ChannelAccounts, control: ChannelControl, ws: string, row: AccountRow, op?: 'start' | 'stop') => async () => {
  await accounts.route(ws, row, routeStatusOf(row.status as AccountStatus, row.pausedAt));
  if (op) await control.send({ op, account_id: row.id });
};

@Injectable()
@ActionHandler('channel.update_settings')
export class ChannelUpdateSettingsHandler implements Handler<ActionInput<typeof channelUpdateSettings>, Ok> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof channelUpdateSettings>, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const row = await need(this.accounts).live(tx, input.channel_account_id);
    const { name, agent_id, ...rest } = input.patch;
    const prev = settingsOf(row);
    // `agent_id: ''` = bỏ gán agent (ô chọn "—").
    const next: AccountSettings = { ...prev, ...rest, ...(agent_id !== undefined ? { agent_id: agent_id || null } : {}) };
    await tx.channelAccount.update({ where: { id: row.id }, data: { settings: { ...next }, ...(name ? { name } : {}), updatedAt: this.clock.now() } });
    return { result: { ok: true }, before: { id: row.id, name: row.name, settings: prev }, after: { id: row.id, name: name ?? row.name, settings: next } };
  }
}

@Injectable()
@ActionHandler('channel.pause')
export class ChannelPauseHandler implements Handler<ActionInput<typeof channelPause>, Ok> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof channelPause>, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const accounts = need(this.accounts);
    const row = await accounts.live(tx, input.channel_account_id);
    if (row.pausedAt) return { result: { ok: true } };
    const { row: next, event } = await accounts.setStatus(tx, row, { pausedAt: this.clock.now() }, this.clock.now(), 'paused');
    return { result: { ok: true }, after: { id: row.id, paused: true }, events: event ? [event] : [], afterCommit: sync(accounts, need(this.control), ctx.workspaceId, next, 'stop') };
  }
}

@Injectable()
@ActionHandler('channel.resume')
export class ChannelResumeHandler implements Handler<ActionInput<typeof channelResume>, Ok> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof channelResume>, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const accounts = need(this.accounts);
    const row = await accounts.live(tx, input.channel_account_id);
    if (!row.pausedAt) return { result: { ok: true } };
    // Tự tạm dừng vì lỗi gửi bất thường: tiếp tục = xoá dấu lỗi cũ (đếm lại từ đầu).
    const { row: next, event } = await accounts.setStatus(tx, row, { pausedAt: null, health: { status: 'connected' } }, this.clock.now());
    const op = next.status === 'connected' ? 'start' : undefined;
    return { result: { ok: true }, after: { id: row.id, paused: false }, events: event ? [event] : [], afterCommit: sync(accounts, need(this.control), ctx.workspaceId, next, op) };
  }
}

@Injectable()
@ActionHandler('channel.sync_history')
export class ChannelSyncHistoryHandler implements Handler<ActionInput<typeof channelSyncHistory>, Ok> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
  ) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof channelSyncHistory>, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const row = await need(this.accounts).live(tx, input.channel_account_id);
    const control = need(this.control);
    const prev = settingsOf(row);
    await tx.channelAccount.update({ where: { id: row.id }, data: { settings: { ...prev, history_days: input.history_days } } });
    const run = row.status === 'connected' && !row.pausedAt && input.history_days > 0;
    return {
      result: { ok: true },
      before: { id: row.id, history_days: prev.history_days },
      after: { id: row.id, history_days: input.history_days, requested: run },
      afterCommit: run ? () => control.send({ op: 'sync', account_id: row.id, days: input.history_days }) : undefined,
    };
  }
}

@Injectable()
@ActionHandler('channel.test')
export class ChannelTestHandler implements Handler<ActionInput<typeof channelTest>, { ok: boolean; message?: string }> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
  ) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof channelTest>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean; message?: string }>> {
    // Form nháp (Email IMAP / SMTP trước khi lưu) là TIP-018.
    if (!('channel_account_id' in input)) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '018' }, `channel.test ${input.type} — TIP-018`);
    const row = await need(this.accounts).live(tx, input.channel_account_id);
    const m = serverMessages('vi').channels.test;
    if (row.pausedAt) return { result: { ok: false, message: m.paused } };
    if (row.status === 'connecting' || row.status === 'pending') return { result: { ok: false, message: m.connecting } };
    if (row.status === 'expired') return { result: { ok: false, message: m.expired } };
    // Kênh không giữ phiên (webchat — khách nối thẳng API): chạy = connected + không tạm dừng.
    if (channelRegistry.get(row.type)?.manifest.session !== 'lease') return { result: row.status === 'connected' ? { ok: true, message: m.ok } : { ok: false, message: m.error } };
    // Có worker đang giữ lease = phiên sống (worker gia hạn mỗi 10 giây, mất phiên thì nhả lease).
    const held = await need(this.control).held(row.id);
    return { result: held && row.status === 'connected' ? { ok: true, message: m.ok } : { ok: false, message: m.error } };
  }
}

@Injectable()
@ActionHandler('channel.disconnect')
export class ChannelDisconnectHandler implements Handler<ActionInput<typeof channelDisconnect>, Ok> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof channelDisconnect>, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const accounts = need(this.accounts);
    const control = need(this.control);
    const row = await accounts.live(tx, input.channel_account_id);
    // Lịch sử hội thoại giữ nguyên (Blueprint §3.4); credential xoá; tài khoản cuối → loại kênh "Chưa kết nối" (tính ở đọc).
    const { row: next, event } = await accounts.setStatus(tx, row, { status: 'disconnected' }, this.clock.now(), 'disconnected');
    return {
      result: { ok: true },
      before: { id: row.id, type: row.type, name: row.name, status: row.status },
      events: event ? [event] : [],
      afterCommit: async () => {
        await sync(accounts, control, ctx.workspaceId, next, 'stop')();
        await control.clearLogin(row.id);
      },
    };
  }
}
