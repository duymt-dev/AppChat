// IntegrationResolver.get(ws, port) (provider-ports §4): kết nối `connected` của workspace theo port + adapter + bí mật đã giải.
// Chưa kết nối → null — nghiệp vụ phải chạy được khi chưa có connector (vd. không hoá đơn điện tử thì chỉ có Đề nghị thanh toán).
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { ConnectionCtx, ConnectorAdapter, ConnectorRegistry, PortKey } from '@appchat/integrations';
import { connectionCtx } from './connections.service';

export interface ResolvedConnection<A extends ConnectorAdapter = ConnectorAdapter> {
  connectorKey: string;
  adapter: A | null;
  conn: ConnectionCtx;
}

export class IntegrationResolver {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly registry: ConnectorRegistry,
    private readonly key: Buffer,
  ) {}

  async get<A extends ConnectorAdapter = ConnectorAdapter>(workspaceId: string, port: PortKey): Promise<ResolvedConnection<A> | null> {
    const db = await this.tenants.get(TenantContexts.system(workspaceId, `integration:${port}`));
    const row = await db.integrationConnection.findFirst({ where: { port, status: 'connected' }, orderBy: { updatedAt: 'desc' } });
    if (!row) return null;
    const adapter = (this.registry.get(row.connectorKey)?.adapter as A | undefined) ?? null;
    return { connectorKey: row.connectorKey, adapter, conn: connectionCtx(row, this.key) };
  }
}
