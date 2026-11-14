// Dữ liệu + lệnh gọi chung cho bộ integration TIP-037 (marketing): khách + hội thoại Zalo 1-1 trên tài khoản gửi ghi thẳng DB tenant (luồng
// kết nối / nhận tin thật đã kiểm ở channels / inbox test), lệnh action qua HTTP như FE, action hệ thống qua Executor với actor cố định
// (HTTP không gửi được nguồn system), kết quả kênh mô phỏng qua campaign.record_delivery (worker gửi thật cần Zalo — chưa nghiệm thu thật).
import { ActionExecutor, MarketingDeps, marketingSystemCtx, MARKETING_ACTORS, tickWorkspace, uuidv7, type ChannelSendQueue } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { call, env, type Harness } from '../setup';

type Who = { id: string; token: string };
export type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const json = async (r: Response): Promise<Res> => ({ status: r.status, body: await r.json().catch(() => null) });
/** Token cấp lại theo đồng hồ test (bài dịch đồng hồ nhiều ngày — token cũ hết hạn). */
const asOf = (h: Harness, u?: Who): Record<string, string> => (u ? { authorization: `Bearer ${h.tokenFor(u.id)}` } : {});

let seq = 0;
const unsubLinksOf = (h: Harness) => h.app.get(MarketingDeps, { strict: false }).links;

export class Mk {
  readonly resolver: TenantDbResolver;

  constructor(readonly h: Harness) {
    this.resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  }

  db(): Promise<TenantDb> {
    return this.resolver.get(TenantContexts.system(this.h.ws, 't'));
  }

  act(id: string, input: unknown, who?: Who, headers: Record<string, string> = {}): Promise<Res> {
    return call(this.h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...asOf(this.h, who), ...headers }).then(json);
  }

  /** Lệnh cần xác nhận (bulk / preview): 202 + confirm_token → gửi lại kèm token (người bấm xác nhận). */
  async confirmed(id: string, input: unknown, who?: Who): Promise<Res> {
    const key = uuidv7();
    const p = await call(this.h, `/actions/${id}`, { input }, { 'idempotency-key': key, ...asOf(this.h, who) }).then(json);
    if (p.status !== 202 || !p.body?.data?.confirm_token) return p;
    return call(this.h, `/actions/${id}`, { input, confirm_token: p.body.data.confirm_token }, { 'idempotency-key': key, ...asOf(this.h, who) }).then(json);
  }

  get(path: string, who?: Who): Promise<Res> {
    return call(this.h, path, undefined, asOf(this.h, who)).then(json);
  }

  undo(logId: string, who?: Who): Promise<Res> {
    return call(this.h, `/action-logs/${logId}/undo`, {}, asOf(this.h, who)).then(json);
  }

  executor(): ActionExecutor {
    return this.h.app.get(ActionExecutor, { strict: false });
  }

  /** Action hệ thống đúng actor (scheduler / worker gửi / consumer). */
  system(actor: keyof typeof MARKETING_ACTORS, id: string, input: unknown, key = uuidv7()) {
    return this.executor().execute(marketingSystemCtx(this.h.ws, MARKETING_ACTORS[actor], key), id, input);
  }

  /** Một vòng quét scheduler (không Redis hàng gửi — người nhận được nhận lô, kết quả kênh ghi tay qua `deliver`). */
  tick() {
    return this.tickWith(null);
  }

  /** Vòng quét có hàng gửi thật (Redis) + link huỷ nhận tin — như scheduler ROLE=jobs. */
  tickWith(send: ChannelSendQueue | null) {
    const links = send ? unsubLinksOf(this.h) : null;
    return tickWorkspace({ platform: this.h.platform, tenants: this.resolver, executor: this.executor(), send, links, now: () => this.h.clock.now() }, this.h.ws);
  }

  deliver(recipientId: string, outcome: 'accepted' | 'unknown' | 'failed', definite = outcome !== 'unknown') {
    return this.system('delivery', 'campaign.record_delivery', { delivery_ref: `cr_${recipientId}`, outcome, definite, ...(outcome === 'accepted' ? { external_msg_id: `z-${recipientId}` } : {}) }, `cr_${recipientId}:${outcome}:${definite ? 1 : 0}`);
  }

  async account(type: 'zalo_personal' | 'email', name: string, o: { status?: 'connected' | 'expired' | 'connecting'; paused?: boolean } = {}): Promise<string> {
    const id = uuidv7();
    this.h.clock.advance(1000);
    await (await this.db()).channelAccount.create({ data: { id, type, name, status: o.status ?? 'connected', settings: {}, pausedAt: o.paused ? this.h.clock.now() : null, createdAt: this.h.clock.now() } });
    return id;
  }

  /** Khách + (tuỳ chọn) hội thoại 1-1 Zalo trên `zaloAccount` → nhận được tin chiến dịch Zalo. */
  async contact(o: { name?: string; owner?: string | null; zaloAccount?: string; email?: string; optOut?: boolean; group?: 'vip' | 'loyal' | 'new' | 'potential'; spent?: bigint } = {}): Promise<string> {
    const db = await this.db();
    const id = uuidv7();
    const n = `${Date.now() % 100000}${++seq}`;
    await db.contact.create({
      data: {
        id, code: `KH-MK${n}`, name: o.name ?? `Khách MK ${n}`, phone: `09${n.padStart(8, '0').slice(-8)}`, phoneNorm: `09${n.padStart(8, '0').slice(-8)}`, email: o.email ?? null,
        source: 'manual', ownerUserId: o.owner === undefined ? this.h.user : o.owner, marketingOptOut: o.optOut ?? false, group: o.group ?? null, totalSpent: o.spent ?? 0n, createdAt: this.h.clock.now(),
      },
    });
    if (o.zaloAccount) await db.conversation.create({ data: { id: uuidv7(), channelAccountId: o.zaloAccount, channelType: 'zalo_personal', kind: 'direct', externalThreadId: `mk-${id}`, contactId: id, lastMessageAt: this.h.clock.now() } });
    return id;
  }

  /** Nháp Zalo → gửi duyệt → (tuỳ chọn) duyệt. Trả id + version cuối. */
  async campaign(o: { contacts: string[]; account: string; name?: string; text?: string; approve?: boolean; scheduled_at?: string }) {
    const c = await this.act('campaign.create', { name: o.name ?? 'Chiến dịch test', channel: 'zalo', account_id: o.account, contact_ids: o.contacts, content: { text: o.text ?? 'Chào {ten}, ưu đãi tháng này' }, ...(o.scheduled_at ? { send: 'schedule', scheduled_at: o.scheduled_at } : {}) });
    if (c.status !== 200) throw new Error(`create ${c.status} ${JSON.stringify(c.body)}`);
    const id = c.body.data.result.campaign_id as string;
    const s = await this.act('campaign.submit', { campaign_id: id });
    if (s.status !== 200) throw new Error(`submit ${s.status} ${JSON.stringify(s.body)}`);
    let version = s.body.data.result.version as number;
    if (o.approve) {
      const a = await this.confirmed('campaign.approve', { campaign_id: id, if_version: version });
      if (a.status !== 200) throw new Error(`approve ${a.status} ${JSON.stringify(a.body)}`);
      version = a.body.data.result.version as number;
    }
    return { id, version };
  }

  async recipients(campaignId: string) {
    return (await this.db()).campaignRecipient.findMany({ where: { campaignId }, orderBy: { id: 'asc' } });
  }

  close(): Promise<void> {
    return this.resolver.close();
  }
}
