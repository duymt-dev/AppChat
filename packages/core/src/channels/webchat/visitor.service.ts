// Phiên khách web của namespace `/widget` (TIP-017, Blueprint §4.6): handshake (`public_key` → `tenant_widget_route` → DB tenant,
// Origin theo `allowed_domains`, tài khoản đang chạy), `visitor.hello` (cấp / gia hạn `visitor_token`, cấu hình, lịch sử),
// `message.send` (→ `NormalizedInbound` vào hàng đợi `channel-inbound` — pipeline chung của Inbox, chống trùng theo `client_id`).
import type { Queue } from 'bullmq';
import type { NormalizedInbound } from '@appchat/channels';
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { AppError, normalizePhone, serverMessages, visitorHelloInput, widgetSendInput, type VisitorHelloResult, type WidgetMessage } from '@appchat/shared';
import type { z } from 'zod';
import { uuidv7 } from '../../kernel/ids';
import type { RateLimiter } from '../../kernel/rate-limit';
import { colorOf, originAllowed, prechatOf, type WidgetRow } from './widget.service';
import type { VisitorTokens } from './visitor-token';

export interface WidgetSession {
  ws: string;
  accountId: string;
  publicKey: string;
  /** Khách web đã xác định (token hợp lệ / sau `visitor.hello`). */
  visitorId: string | null;
}

/** Lịch sử trả cho widget lúc `hello` (tin mới nhất). */
const HISTORY = 50;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class VisitorService {
  constructor(
    private readonly platform: Pick<PlatformDb, 'tenantWidgetRoute'>,
    private readonly tenants: TenantDbResolver,
    private readonly tokens: VisitorTokens,
    private readonly inbound: Pick<Queue, 'add'>,
    private readonly limiter: RateLimiter | null,
    private readonly now: () => Date,
  ) {}

  private db(ws: string): Promise<TenantDb> {
    return this.tenants.get(TenantContexts.fromRoute(ws, 'widget'));
  }

  /** Widget + tài khoản đang chạy; tắt / tạm dừng / ngắt → INVALID_STATE `{ widget: offline }` (widget hiện "tạm ngoại tuyến"). */
  private async live(db: TenantDb, publicKey: string): Promise<WidgetRow> {
    const w = await db.webchatWidget.findUnique({ where: { publicKey } });
    if (!w) throw new AppError('NOT_FOUND', 404, { public_key: 'not_found' });
    const acc = await db.channelAccount.findUnique({ where: { id: w.channelAccountId }, select: { status: true, pausedAt: true } });
    if (!acc || acc.status !== 'connected' || acc.pausedAt) throw new AppError('INVALID_STATE', 409, { widget: 'offline' });
    return w;
  }

  /** Handshake: key → workspace (route nền tảng), Origin, trạng thái; token cũ hợp lệ cùng tài khoản → nhận lại khách. */
  async connect(a: { publicKey: unknown; token: unknown; origin: string | undefined; ip: string }): Promise<WidgetSession> {
    if (typeof a.publicKey !== 'string' || !/^wk_[A-Za-z0-9_-]{8,64}$/.test(a.publicKey)) throw new AppError('NOT_FOUND', 404, { public_key: 'not_found' });
    await this.limiter?.hit({ name: 'widget:connect', limit: 60, windowMs: 60_000 }, a.ip);
    const route = await this.platform.tenantWidgetRoute.findUnique({ where: { publicKey: a.publicKey } });
    if (!route) throw new AppError('NOT_FOUND', 404, { public_key: 'not_found' });
    if (!originAllowed(a.origin, route.allowedDomains)) throw new AppError('FORBIDDEN', 403, { origin: 'not_allowed' });
    const w = await this.live(await this.db(route.workspaceId), a.publicKey);
    const claims = typeof a.token === 'string' ? this.tokens.verify(a.token, this.now().getTime()) : null;
    const visitorId = claims && claims.acc === w.channelAccountId && claims.ws === route.workspaceId ? claims.sub : null;
    return { ws: route.workspaceId, accountId: w.channelAccountId, publicKey: a.publicKey, visitorId };
  }

  /** `visitor.hello`: tạo / cập nhật khách web, cấp token mới (30 ngày tính từ lần này), cấu hình widget + lịch sử. */
  async hello(s: WidgetSession, raw: unknown): Promise<VisitorHelloResult> {
    const p = visitorHelloInput.parse(raw);
    const db = await this.db(s.ws);
    const w = await this.live(db, s.publicKey);
    const now = this.now();
    const info = this.info(p);
    const known = s.visitorId ? await db.webchatVisitor.findUnique({ where: { id: s.visitorId } }) : null;
    const v = known
      ? await db.webchatVisitor.update({ where: { id: known.id }, data: { ...info, lastSeenAt: now } })
      : await db.webchatVisitor.create({ data: { id: uuidv7(now.getTime()), channelAccountId: s.accountId, ...info, createdAt: now, lastSeenAt: now } });
    s.visitorId = v.id;
    const pre = prechatOf(w);
    return {
      visitor_id: v.id,
      visitor_token: this.tokens.issue({ visitorId: v.id, accountId: s.accountId, ws: s.ws }, now.getTime()),
      config: { name: w.name, greeting: w.greeting, color: colorOf(w), prechat: { enabled: pre.enabled, fields: pre.fields } },
      ready: this.ready(pre, v),
      messages: await this.history(db, s.accountId, v.id),
    };
  }

  /** `message.send` → hàng đợi inbound (job id = khách + client_id: gửi lại cùng tin không thành hai tin). */
  async send(s: WidgetSession, raw: unknown, ip: string): Promise<{ id: string; at: string }> {
    const p = widgetSendInput.parse(raw);
    if (!s.visitorId) throw new AppError('INVALID_STATE', 409, { visitor: 'hello_required' });
    await this.limiter?.hit({ name: 'widget:send', limit: 20, windowMs: 60_000 }, s.visitorId);
    await this.limiter?.hit({ name: 'widget:send-ip', limit: 120, windowMs: 60_000 }, ip);
    const db = await this.db(s.ws);
    const w = await this.live(db, s.publicKey);
    const v = await db.webchatVisitor.findUnique({ where: { id: s.visitorId } });
    if (!v) throw new AppError('INVALID_STATE', 409, { visitor: 'hello_required' });
    if (!this.ready(prechatOf(w), v)) throw new AppError('VALIDATION_FAILED', 422, { prechat: 'required' });
    const at = this.now();
    const msg: NormalizedInbound = {
      channelAccountId: s.accountId,
      externalThreadId: v.id,
      externalMsgId: `c-${v.id}-${p.client_id}`,
      isGroup: false,
      sender: { externalId: v.id, name: v.name ?? serverMessages('vi').channels.widget.guest, ...(v.phone ? { phone: v.phone } : {}), ...(v.email ? { email: v.email } : {}) },
      kind: 'text',
      text: p.text,
      sentAt: at.toISOString(),
      raw: { page_url: v.pageUrl },
    };
    await this.inbound.add('inbound', { ws: s.ws, message: msg }, {
      jobId: `in-${s.accountId}-${msg.externalMsgId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    await db.webchatVisitor.update({ where: { id: v.id }, data: { lastSeenAt: at } });
    return { id: p.client_id, at: at.toISOString() };
  }

  private info(p: z.infer<typeof visitorHelloInput>) {
    return {
      ...(p.name ? { name: p.name } : {}),
      ...(p.phone && normalizePhone(p.phone) ? { phone: p.phone } : {}),
      ...(p.email && EMAIL.test(p.email) ? { email: p.email.toLowerCase() } : {}),
      ...(p.page_url ? { pageUrl: p.page_url } : {}),
    };
  }

  /** Pre-chat bật: đủ các trường bắt buộc (tên + SĐT mặc định) mới chat được. */
  private ready(pre: ReturnType<typeof prechatOf>, v: { name: string | null; phone: string | null; email: string | null }): boolean {
    if (!pre.enabled) return true;
    return pre.fields.every((f) => !!v[f]);
  }

  /** 50 tin gần nhất của hội thoại khách này (cũ → mới); ghi chú nội bộ / tin đã xoá / thu hồi không gửi ra widget. */
  private async history(db: TenantDb, accountId: string, visitorId: string): Promise<WidgetMessage[]> {
    const conv = await db.conversation.findUnique({ where: { channelAccountId_externalThreadId: { channelAccountId: accountId, externalThreadId: visitorId } }, select: { id: true } });
    if (!conv) return [];
    const rows = await db.message.findMany({
      where: { conversationId: conv.id, direction: { not: null }, kind: { notIn: ['note', 'system'] }, deletedAt: null, recalledAt: null, status: { not: 'failed' } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: HISTORY,
    });
    return rows.reverse().map((m) => {
      // Tin khách: id = client_id widget đã sinh (khớp tin hiện sẵn ở widget); tin shop: id phía kênh (trùng `message.new`).
      const ext = m.externalMsgId ?? m.id;
      const id = m.direction === 'in' && ext.startsWith(`c-${visitorId}-`) ? ext.slice(`c-${visitorId}-`.length) : ext;
      const att = Array.isArray(m.attachments) ? (m.attachments as WidgetMessage['attachments']) : undefined;
      return { id, direction: m.direction as 'in' | 'out', text: m.body, at: m.createdAt.toISOString(), ...(att?.length ? { attachments: att } : {}) };
    });
  }
}
