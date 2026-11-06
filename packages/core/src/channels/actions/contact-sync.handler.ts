// channel.sync_contacts (TIP-014b D3, channels.manage, không cho agent): tài khoản phải chạy được (đã kết nối, không tạm dừng) và kênh khai
// `operations.friends = remote` — không thì 409 / 422. Ghi lần đồng bộ `queued` + outbox `channel.contacts_requested` cùng commit → 202
// job_accepted + status_url. Không tạo khách, không gửi lời mời / tin; ảnh chụp riêng tài khoản hạn 24 giờ.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import { operationMode, type ChannelRegistry } from '@appchat/channels';
import type { ActionInput, ActionPreview, channelSyncContacts } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview } from '../../kernel/actions/preview-kit';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { actorUserId } from '../../inbox/services/access';
import { ChannelAccounts } from '../services/accounts.service';
import { CHANNEL_REGISTRY } from '../tokens';
import { contactSyncStatusUrl, requestContactSync } from '../operations/contact-sync';

type Input = ActionInput<typeof channelSyncContacts>;
type Ok = { ok: boolean };

@Injectable()
@ActionHandler('channel.sync_contacts')
export class ChannelSyncContactsHandler implements Handler<Input, Ok> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private async runnable(tx: TenantTx, id: string) {
    if (!this.accounts) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'channels chưa cấu hình (Redis / PlatformDb)');
    const row = await this.accounts.live(tx, id);
    if (operationMode(this.registry.get(row.type)?.manifest.capabilities.operations, 'friends') !== 'remote') throw new AppError('VALIDATION_FAILED', 422, { channel_account_id: 'contacts_unsupported' });
    if (row.status !== 'connected' || row.pausedAt) throw new AppError('CONFLICT', 409, { channel_account_id: 'not_running' });
    return row;
  }

  async preview(_ctx: ActionContext, i: Input, tx: TenantTx): Promise<ActionPreview> {
    const row = await this.runnable(tx, i.channel_account_id);
    return preview('write', row.name, { changes: [created('channel_contact_sync', { channel_account_id: row.id })], warnings: ['contacts_private_24h'] });
  }

  async execute(ctx: ActionContext, i: Input, tx: TenantTx): Promise<HandlerOutcome<Ok>> {
    const row = await this.runnable(tx, i.channel_account_id);
    const s = await requestContactSync(tx, { accountId: row.id, actorId: actorUserId(ctx) ?? null, now: this.clock.now() });
    return { result: { ok: true }, after: { id: s.id, channel_account_id: row.id }, events: [s.event], ...jobAccepted(s.id, contactSyncStatusUrl(row.id, s.id)) };
  }
}
