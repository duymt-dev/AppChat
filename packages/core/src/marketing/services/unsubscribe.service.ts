// Trang huỷ nhận tin công khai (TIP-037): token ký → workspace (phần đầu token, chữ ký kiểm bằng khoá chủ) → GET chỉ đọc (tên doanh nghiệp,
// đã huỷ chưa — không lộ tên / liên hệ khách) · POST gọi action hệ thống campaign.unsubscribe qua Executor (token kiểm lại ở handler, không
// nhận contact_id). Token sai / hết hạn / workspace không hoạt động → 404 chung.
import { TenantContexts, type PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { MarketingDeps } from './marketing-deps';
import { MARKETING_ACTORS, systemCtx } from './marketing-system';
import { readUnsubToken } from './unsubscribe-token';

const invalid = () => new AppError('NOT_FOUND', 404, { token: 'invalid' });

export class UnsubscribeService {
  constructor(
    private readonly d: MarketingDeps,
    private readonly platform: PlatformDb | null,
    private readonly executor: Pick<ActionExecutor, 'execute'> | null,
    private readonly now: () => Date,
  ) {}

  private async resolve(token: string) {
    const key = this.d.links?.key;
    const t = key ? readUnsubToken(key, token.slice(0, 400), this.now()) : null;
    if (!t || !this.platform) throw invalid();
    const ws = await this.platform.workspace.findUnique({ where: { id: t.ws }, select: { name: true, dbStatus: true } });
    if (!ws || ws.dbStatus !== 'active') throw invalid();
    const db = await this.d.tenants().get(TenantContexts.system(t.ws, 'campaign.unsubscribe'));
    const r = await db.campaignRecipient.findUnique({ where: { id: t.recipientId }, select: { contactId: true } });
    const c = r ? await db.contact.findUnique({ where: { id: r.contactId }, select: { marketingOptOut: true, deletedAt: true } }) : null;
    if (!c || c.deletedAt) throw invalid();
    return { ws: t.ws, business: ws.name, done: c.marketingOptOut };
  }

  async view(token: string): Promise<{ business: string; unsubscribed: boolean }> {
    const r = await this.resolve(token);
    return { business: r.business, unsubscribed: r.done };
  }

  async confirm(token: string): Promise<{ business: string; unsubscribed: boolean }> {
    const r = await this.resolve(token);
    if (!this.executor) throw new AppError('NOT_IMPLEMENTED', 501, { unsubscribe: 'unavailable' });
    if (!r.done) await this.executor.execute(systemCtx(r.ws, MARKETING_ACTORS.unsubscribe, `unsub:${token.slice(-32)}`), 'campaign.unsubscribe', { token });
    return { business: r.business, unsubscribed: true };
  }
}
