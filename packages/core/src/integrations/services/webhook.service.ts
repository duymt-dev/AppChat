// Webhook vào (provider-ports §6): route chung `/hooks/integrations/:connector/:connectionId` → tra `tenant_integration_route`
// (DB nền tảng) → kiểm chữ ký TRONG adapter → insert `integration_event` idempotent theo id provider → outbox
// `integration.event_received` (consumer domain xử lý qua queue). Trả nhanh, không xử lý nghiệp vụ ở đây.
import { AppError } from '@appchat/shared';
import type { ConnectorRegistry, WebhookRequest } from '@appchat/integrations';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { connectionCtx } from './connections.service';
import { adapterOf } from './adapter-selection';

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

  async receive(connector: string, connectionId: string, req: WebhookRequest): Promise<{ ok: true; duplicate: boolean }> {
    // Route lạ / connector lệch / đã ngắt → cùng 404 (không lộ kết nối nào tồn tại).
    const notFound = () => new AppError('NOT_FOUND', 404, { connection: 'unknown' });
    if (!UUID.test(connectionId)) throw notFound();
    const route = await this.platform.tenantIntegrationRoute.findUnique({ where: { connectionId } });
    if (!route || route.connectorKey !== connector || route.status !== 'connected') throw notFound();
    const db = await this.tenants.get(TenantContexts.fromRoute(route.workspaceId, 'integration'));
    const row = await db.integrationConnection.findUnique({ where: { id: connectionId } });
    // Adapter theo chế độ đã lưu của kết nối (live không lùi về giả lập) — không có → 404 như route lạ.
    const adapter = row ? adapterOf(this.registry, connector, row.mode) : null;
    if (!row || row.status === 'disconnected' || !adapter?.verifyWebhook) throw notFound();

    const ev = adapter.verifyWebhook(connectionCtx(row, this.key), req);
    if (!ev) throw new AppError('UNAUTHENTICATED', 401, { signature: 'invalid' });

    const now = this.now();
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
}
