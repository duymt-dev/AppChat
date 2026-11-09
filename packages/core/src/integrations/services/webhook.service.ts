// Webhook vào (provider-ports §6): route chung `/hooks/integrations/:connector/:connectionId` → tra `tenant_integration_route`
// (DB nền tảng) → kiểm chữ ký TRONG adapter → insert `integration_event` idempotent theo id provider → outbox
// `integration.event_received` (consumer domain xử lý qua queue). Trả nhanh, không xử lý nghiệp vụ ở đây. Kết nối ngân hàng có feed tài
// chính đang bật → ingress chuẩn tắc của sales (TIP-012b §2.4 mục 4, bank-ingress-sink.ts) — cùng biên nhận với /hooks/tenant-payments.
// Port `mail` (TIP-012c) → mail/ingress.ts (biên nhận sự kiện giao thư); route đã ngắt chỉ port mail tra binding callback giữ riêng.
import { AppError } from '@appchat/shared';
import { isTenantMail, type ConnectorRegistry, type WebhookRequest } from '@appchat/integrations';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { connectionCtx } from './connections.service';
import { adapterOf } from './adapter-selection';
import { bankIngressSink } from './bank-ingress-sink';
import { authenticate, ingestMailEvents } from '../mail/ingress';
import { retainedTokens } from '../mail/bindings';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class IntegrationWebhooks {
  constructor(
    private readonly platform: Pick<PlatformDb, 'tenantIntegrationRoute'>,
    private readonly tenants: TenantDbResolver,
    private readonly registry: ConnectorRegistry,
    private readonly key: Buffer,
    private readonly kv: KeyValueStore,
    private readonly now: () => Date,
  ) {}

  async receive(connector: string, connectionId: string, req: WebhookRequest): Promise<HookAck> {
    // Route lạ / connector lệch / đã ngắt → cùng 404 (không lộ kết nối nào tồn tại).
    const notFound = () => new AppError('NOT_FOUND', 404, { connection: 'unknown' });
    if (!UUID.test(connectionId)) throw notFound();
    const route = await this.platform.tenantIntegrationRoute.findUnique({ where: { connectionId } });
    if (!route || route.connectorKey !== connector) throw notFound();
    // TIP-012c §4.5: CHỈ port mail được tra route đã ngắt → binding callback giữ riêng; port khác giữ 404 như cũ.
    if (route.status !== 'connected') return this.mailLate(route.workspaceId, connector, connectionId, req, notFound);
    const db = await this.tenants.get(TenantContexts.fromRoute(route.workspaceId, 'integration'));
    const row = await db.integrationConnection.findUnique({ where: { id: connectionId } });
    // Adapter theo chế độ đã lưu của kết nối (live không lùi về giả lập) — không có → 404 như route lạ.
    const adapter = row ? adapterOf(this.registry, connector, row.mode) : null;
    if (!row || row.status === 'disconnected' || !adapter?.verifyWebhook) throw notFound();

    if (row.port === 'mail') return this.mail(route.workspaceId, connector, row, req, notFound);
    const ev = adapter.verifyWebhook(connectionCtx(row, this.key), req);
    if (!ev) throw new AppError('UNAUTHENTICATED', 401, { signature: 'invalid' });

    const now = this.now();
    const sink = row.port === 'bank_feed' ? bankIngressSink() : null;
    if (sink) {
      const r = await sink({ db, ws: route.workspaceId, provider: connector, connId: connectionId, adapter, ctx: connectionCtx(row, this.key), payload: ev.payload, now });
      if (r) return { ok: true, duplicate: r.accepted === 0 && r.ignored === 0, accepted: r.accepted, ignored: r.ignored };
    }
    const inserted = await db.$transaction(async (tx) => {
      const id = uuidv7(now.getTime());
      const r = await tx.integrationEvent.createMany({
        data: [{ id, connectionId, externalEventId: ev.id, kind: ev.kind, payload: ev.payload as object, createdAt: now }],
        skipDuplicates: true,
      });
      await tx.integrationConnection.update({ where: { id: connectionId }, data: { lastEventAt: now } });
      if (r.count === 0) return false;
      await writeOutbox(
        tx,
        route.workspaceId,
        [{ topic: 'integration.event_received', payload: { connection_id: connectionId, connector_key: connector, port: row.port, event_id: id, kind: ev.kind } }],
        now,
      );
      return true;
    });
    if (inserted) await markDirty(this.kv, route.workspaceId);
    return { ok: true, duplicate: !inserted };
  }

  /** Mail của DN: token hiện tại hoặc token đã giữ còn hạn → biên nhận sự kiện (mail/ingress.ts). */
  private async mail(ws: string, connector: string, row: ConnRow, req: WebhookRequest, notFound: () => AppError): Promise<HookAck> {
    const db = await this.tenants.get(TenantContexts.fromRoute(ws, 'integration'));
    const adapter = adapterOf(this.registry, connector, row.mode);
    if (!isTenantMail(adapter)) throw notFound();
    const now = this.now();
    const ctx = row.status === 'disconnected' || !row.secretEnc ? null : connectionCtx(row, this.key);
    const evs = authenticate(adapter, ctx, await retainedTokens(db, row.id, this.key, now), row.id, req);
    if (!evs) throw ctx ? new AppError('UNAUTHENTICATED', 401, { signature: 'invalid' }) : notFound();
    const accountRef = ((row.mailSenders as { account_ref?: string | null } | null)?.account_ref ?? '') || '';
    const r = await ingestMailEvents(db, ws, row.id, accountRef, evs, now);
    if (r.accepted) await markDirty(this.kv, ws);
    return { ok: true, duplicate: r.accepted === 0 && r.unresolved === 0 && r.duplicate > 0, accepted: r.accepted, ignored: r.unresolved };
  }

  /** Route đã ngắt: chỉ kết nối mail còn binding callback hợp lệ; còn lại 404 đồng nhất. */
  private async mailLate(ws: string, connector: string, connectionId: string, req: WebhookRequest, notFound: () => AppError): Promise<HookAck> {
    const db = await this.tenants.get(TenantContexts.fromRoute(ws, 'integration'));
    const row = await db.integrationConnection.findUnique({ where: { id: connectionId } });
    if (!row || row.port !== 'mail' || row.connectorKey !== connector) throw notFound();
    return this.mail(ws, connector, row, req, notFound);
  }
}

type ConnRow = NonNullable<Awaited<ReturnType<Awaited<ReturnType<TenantDbResolver['get']>>['integrationConnection']['findUnique']>>>;
type HookAck = { ok: true; duplicate: boolean; accepted?: number; ignored?: number };
