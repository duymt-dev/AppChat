// Quản lý tài khoản kênh (REQ-B11 drawer, Blueprint §3.4): update_settings · pause / resume · sync_history · test · disconnect.
// Lệnh tới phiên đang chạy (dừng / chạy lại / đồng bộ) gửi SAU commit qua ChannelControl; route DB nền tảng đồng bộ cùng lúc.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, can, serverMessages } from '@appchat/shared';
import { channelRegistry, type ChannelRegistry } from '@appchat/channels';
import type { ActionInput, channelDisconnect, channelPause, channelResume, channelSyncHistory, channelTest, channelUpdateSettings } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { CHANNEL_REGISTRY } from '../tokens';
import { emailAdapterOf, emailCredentials, verifyMailbox } from '../email/credentials';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { assertAgentAssignable } from '../../ai/agents/agent-names';
import { assertBindingVersion, assertRouting, scheduleForAccount } from '../../ai/agents/channel-agent-config';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { ChannelAccounts, checkProactiveCap, routeStatusOf, settingsOf, type AccountRow, type AccountStatus, type AccountSettings } from '../services/accounts.service';
import { ChannelControl } from '../services/control';
import { historyStatusUrl, requestHistory } from '../operations/history-run';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { actorUserId } from '../../inbox/services/access';
import { disconnectPreview, pausePreview, resumePreview, syncHistoryPreview, updateSettingsPreview } from './previews/channel-manage.handlers.preview';

type Ok = { ok: boolean };
type SettingsOk = { ok: boolean; warnings?: string[] };

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
export class ChannelUpdateSettingsHandler implements Handler<ActionInput<typeof channelUpdateSettings>, SettingsOk> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof channelUpdateSettings>, tx: TenantTx): Promise<HandlerOutcome<SettingsOk>> {
    // TIP-042b: `assign_mode` chỉ là bản chiếu cũ (chia lead thật = `lead_routing.update`) nhưng vẫn là cấu hình phân công → cần crm.reassign.
    if (input.patch.assign_mode !== undefined && !can(ctx.authz, 'crm.reassign')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
    const row = await need(this.accounts).live(tx, input.channel_account_id);
    const { name, agent_id, schedule, routing, sla_override, ...rest } = input.patch;
    await assertAgentAssignable(tx, agent_id);
    // TIP-022b: gán / phân luồng đổi đồng thời kể từ lúc xem → 409; lịch + ứng viên phân luồng kiểm ở server.
    assertBindingVersion(row.settings, input.expected_version);
    const capDefault = channelRegistry.get(row.type)?.manifest.rateLimit.perDayProactive;
    const warnings = checkProactiveCap(row.type, capDefault, rest.daily_cap);
    const sched = scheduleForAccount(schedule);
    const route = await assertRouting(tx, routing, row.type);
    const prev = settingsOf(row);
    // `agent_id: ''` = bỏ gán agent (ô chọn "—").
    const next: AccountSettings = {
      ...prev,
      ...rest,
      ...(agent_id !== undefined ? { agent_id: agent_id || null } : {}),
      ...(sched !== undefined ? { schedule: sched } : {}),
      ...(route ? { routing: route } : {}),
      ...(sla_override ? { sla_override } : {}),
    };
    if (sla_override === null) delete next.sla_override;
    await tx.channelAccount.update({ where: { id: row.id }, data: { settings: JSON.parse(JSON.stringify(next)) as object, ...(name ? { name } : {}), updatedAt: this.clock.now() } });
    return {
      result: { ok: true, ...(warnings.length ? { warnings } : {}) },
      before: { id: row.id, name: row.name, settings: prev },
      after: { id: row.id, name: name ?? row.name, settings: next },
    };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof channelUpdateSettings>, tx: TenantTx) {
    return updateSettingsPreview(need(this.accounts), tx, input);
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

  async preview(_ctx: ActionContext, input: ActionInput<typeof channelPause>, tx: TenantTx) {
    return pausePreview(need(this.accounts), tx, input);
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

  async preview(_ctx: ActionContext, input: ActionInput<typeof channelResume>, tx: TenantTx) {
    return resumePreview(need(this.accounts), tx, input);
  }
}

@Injectable()
@ActionHandler('channel.sync_history')
export class ChannelSyncHistoryHandler implements Handler<ActionInput<typeof channelSyncHistory>, Ok> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof channelSyncHistory>, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const row = await need(this.accounts).live(tx, input.channel_account_id);
    const control = need(this.control);
    const prev = settingsOf(row);
    await tx.channelAccount.update({ where: { id: row.id }, data: { settings: { ...prev, history_days: input.history_days } } });
    const run = row.status === 'connected' && !row.pausedAt && input.history_days > 0;
    const base = { result: { ok: true }, before: { id: row.id, history_days: prev.history_days }, after: { id: row.id, history_days: input.history_days, requested: run } };
    if (!run) return base;
    // Kênh lease (Zalo — TIP-014b C): lần lấy lịch sử bền + 202, worker giữ phiên chạy và báo cáo khoảng thực thấy.
    if (channelRegistry.get(row.type)?.manifest.session === 'lease') {
      const h = await requestHistory(tx, { accountId: row.id, actorId: actorUserId(ctx) ?? null, days: input.history_days, now: this.clock.now() });
      return { ...base, events: [h.event], ...jobAccepted(h.id, historyStatusUrl(row.id, h.id)) };
    }
    // Kênh poll (email): bỏ mốc + poll lại theo ngày (TIP-018).
    return { ...base, afterCommit: () => control.send({ op: 'sync', account_id: row.id, days: input.history_days }) };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof channelSyncHistory>, tx: TenantTx) {
    return syncHistoryPreview(need(this.accounts), tx, input);
  }
}

@Injectable()
@ActionHandler('channel.test')
export class ChannelTestHandler implements Handler<ActionInput<typeof channelTest>, { ok: boolean; message?: string }> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
  ) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof channelTest>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean; message?: string }>> {
    // Form nháp trước khi lưu (REQ-B10): chỉ Email có form — đăng nhập IMAP + SMTP thật (TIP-018).
    if (!('channel_account_id' in input)) {
      if (input.type !== 'email') throw new AppError('VALIDATION_FAILED', 422, { type: 'unsupported' });
      const address = input.fields.address ?? input.fields.user ?? '';
      const v = await verifyMailbox(emailAdapterOf(this.registry), emailCredentials(address || 'test@invalid.local', input.fields));
      const e = serverMessages('vi').channels;
      return { result: v.ok ? { ok: true, message: e.test.ok } : { ok: false, message: e.email[v.reason as 'imap_auth'] } };
    }
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

  async preview(_ctx: ActionContext, input: ActionInput<typeof channelDisconnect>, tx: TenantTx) {
    return disconnectPreview(need(this.accounts), tx, input);
  }
}
