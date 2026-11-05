// Bạn bè Zalo (TIP-014b E — DC nới DC-247): channel.friend.accept / reject (inbox.reply) · send / undo (inbox.manage) · channel.lookup_user
// (inbox.manage). Mọi lệnh: chỉ nguồn `ui` (người bấm — không Trợ lý / agent / task / API), tài khoản đang chạy + kênh khai năng lực, một
// người mỗi lệnh. Lệnh bền (`channel_friend` queued + outbox) → 202 job_accepted; chỉ ACK nhà cung cấp mới đổi trạng thái. Gửi: định danh đã
// biết + trần / ngày (`friend_daily_cap`, mặc định 20) + cảnh báo rủi ro ở preview. Tra SĐT: trần 30 / ngày, nhật ký, kết quả tạm 24 giờ.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import { operationMode, type ChannelRegistry, type OperationKind } from '@appchat/channels';
import type { ActionInput, ActionPreview, channelFriendAccept, channelLookupUser } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview, updated } from '../../kernel/actions/preview-kit';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { actorUserId } from '../../inbox/services/access';
import { ChannelAccounts, settingsOf } from '../services/accounts.service';
import { CHANNEL_REGISTRY } from '../tokens';
import { FRIEND_LIMITS, friendStatusUrl, humanOnly, lookupStatusUrl, requestFriendOp, requestLookup, type FriendOp } from '../operations/friend-store';

type Target = ActionInput<typeof channelFriendAccept>;
type Ok = { ok: boolean };

abstract class FriendBase {
  constructor(
    protected readonly accounts: ChannelAccounts | null,
    protected readonly registry: ChannelRegistry,
    protected readonly clock: Clock,
  ) {}

  protected async runnable(ctx: ActionContext, tx: TenantTx, id: string, kind: OperationKind) {
    humanOnly(ctx.source);
    if (!this.accounts) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'channels chưa cấu hình (Redis / PlatformDb)');
    const row = await this.accounts.live(tx, id);
    if (operationMode(this.registry.get(row.type)?.manifest.capabilities.operations, kind) !== 'remote') throw new AppError('VALIDATION_FAILED', 422, { channel_account_id: 'friends_unsupported' });
    if (row.status !== 'connected' || row.pausedAt) throw new AppError('CONFLICT', 409, { channel_account_id: 'not_running' });
    return row;
  }

  protected me(ctx: ActionContext): string {
    const id = actorUserId(ctx);
    if (!id) throw new AppError('FORBIDDEN', 403, { source: 'human_only' });
    return id;
  }
}

type FriendIn = Target & { message?: string };

abstract class FriendOpHandler extends FriendBase implements Handler<FriendIn, Ok> {
  protected abstract readonly op: FriendOp;

  protected async previewOp(ctx: ActionContext, i: FriendIn, tx: TenantTx): Promise<ActionPreview> {
    const row = await this.runnable(ctx, tx, i.channel_account_id, 'friend_requests');
    const f = await tx.channelFriend.findUnique({ where: { channelAccountId_externalId: { channelAccountId: row.id, externalId: i.external_id } }, select: { state: true, displayName: true } });
    return preview(this.op === 'send' ? 'send' : 'write', f?.displayName || i.external_id, {
      changes: updated('channel_friend', `${row.id}:${i.external_id}`, { state: f?.state ?? 'none' }, { op: this.op }),
      ...(this.op === 'send' ? { warnings: ['friend_request_risk', `friend_daily_cap:${settingsOf(row).friend_daily_cap ?? FRIEND_LIMITS.sendPerDay}`] } : {}),
    });
  }

  async execute(ctx: ActionContext, i: FriendIn, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const row = await this.runnable(ctx, tx, i.channel_account_id, 'friend_requests');
    const now = this.clock.now();
    const ev = await requestFriendOp(tx, { accountId: row.id, externalId: i.external_id, op: this.op, actorId: this.me(ctx), message: i.message, dailyCap: settingsOf(row).friend_daily_cap ?? FRIEND_LIMITS.sendPerDay, now });
    return { result: { ok: true }, after: { channel_account_id: row.id, external_id: i.external_id, op: this.op }, events: [ev], ...jobAccepted(`${row.id}:${i.external_id}`, friendStatusUrl(row.id, i.external_id)) };
  }
}

@Injectable()
@ActionHandler('channel.friend.accept')
export class ChannelFriendAcceptHandler extends FriendOpHandler {
  protected readonly op = 'accept' as const;
  constructor(@Inject(ChannelAccounts) a: ChannelAccounts | null, @Inject(CHANNEL_REGISTRY) r: ChannelRegistry, @Inject(CLOCK) c: Clock) {
    super(a, r, c);
  }

  async preview(ctx: ActionContext, i: FriendIn, tx: TenantTx): Promise<ActionPreview> {
    return this.previewOp(ctx, i, tx);
  }
}

@Injectable()
@ActionHandler('channel.friend.reject')
export class ChannelFriendRejectHandler extends FriendOpHandler {
  protected readonly op = 'reject' as const;
  constructor(@Inject(ChannelAccounts) a: ChannelAccounts | null, @Inject(CHANNEL_REGISTRY) r: ChannelRegistry, @Inject(CLOCK) c: Clock) {
    super(a, r, c);
  }

  async preview(ctx: ActionContext, i: FriendIn, tx: TenantTx): Promise<ActionPreview> {
    return this.previewOp(ctx, i, tx);
  }
}

@Injectable()
@ActionHandler('channel.friend.send')
export class ChannelFriendSendHandler extends FriendOpHandler {
  protected readonly op = 'send' as const;
  constructor(@Inject(ChannelAccounts) a: ChannelAccounts | null, @Inject(CHANNEL_REGISTRY) r: ChannelRegistry, @Inject(CLOCK) c: Clock) {
    super(a, r, c);
  }

  async preview(ctx: ActionContext, i: FriendIn, tx: TenantTx): Promise<ActionPreview> {
    return this.previewOp(ctx, i, tx);
  }
}

@Injectable()
@ActionHandler('channel.friend.undo')
export class ChannelFriendUndoHandler extends FriendOpHandler {
  protected readonly op = 'undo' as const;
  constructor(@Inject(ChannelAccounts) a: ChannelAccounts | null, @Inject(CHANNEL_REGISTRY) r: ChannelRegistry, @Inject(CLOCK) c: Clock) {
    super(a, r, c);
  }

  async preview(ctx: ActionContext, i: FriendIn, tx: TenantTx): Promise<ActionPreview> {
    return this.previewOp(ctx, i, tx);
  }
}

type LookupIn = ActionInput<typeof channelLookupUser>;

@Injectable()
@ActionHandler('channel.lookup_user')
export class ChannelLookupUserHandler extends FriendBase implements Handler<LookupIn, Ok> {
  constructor(@Inject(ChannelAccounts) a: ChannelAccounts | null, @Inject(CHANNEL_REGISTRY) r: ChannelRegistry, @Inject(CLOCK) c: Clock) {
    super(a, r, c);
  }

  async preview(ctx: ActionContext, i: LookupIn, tx: TenantTx): Promise<ActionPreview> {
    const row = await this.runnable(ctx, tx, i.channel_account_id, 'find_user');
    return preview('write', row.name, { changes: [created('channel_user_lookup', { channel_account_id: row.id })], warnings: [`lookup_daily_cap:${FRIEND_LIMITS.lookupsPerDay}`] });
  }

  async execute(ctx: ActionContext, i: LookupIn, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const row = await this.runnable(ctx, tx, i.channel_account_id, 'find_user');
    const l = await requestLookup(tx, { accountId: row.id, actorId: this.me(ctx), phone: i.phone, now: this.clock.now() });
    // Nhật ký: không ghi SĐT vào action log (chỉ id lần tra) — dòng tra là nơi giữ số, có hạn đọc 24 giờ.
    return { result: { ok: true }, after: { lookup_id: l.id, channel_account_id: row.id }, events: [l.event], ...jobAccepted(l.id, lookupStatusUrl(row.id, l.id)) };
  }
}
