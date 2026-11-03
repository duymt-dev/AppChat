// Kết nối connector của workspace (provider-ports §3, §4; TIP-012): kiểm trường theo manifest, tách bí mật → `secret_enc`
// (AES-256-GCM), kiểm thông tin qua adapter trước khi lưu, upsert theo connector, ghi route webhook ở DB nền tảng.
import { AppError } from '@appchat/shared';
import type { ConnectionCtx, ConnectorEntry, ConnectorRegistry } from '@appchat/integrations';
import type { PlatformDb } from '@appchat/db';
import { openSecrets, sealSecrets } from '../../kernel/crypto';
import { uuidv7 } from '../../kernel/ids';
import type { TenantTx } from '../../kernel/actions/action-context';

type ConnectionRow = { id: string; mode: 'sandbox' | 'live'; config: unknown; secretEnc: Uint8Array | null };

/** Kết nối đang dùng (một mỗi connector — unique partial `integration_connection_active_key`). */
export const IN_USE = { status: { not: 'disconnected' as const } };

/** Bí mật + config đã giải của một dòng kết nối — chỉ trong bộ nhớ (không log, không trả API). */
export function connectionCtx(row: ConnectionRow, key: Buffer): ConnectionCtx {
  return {
    id: row.id,
    mode: row.mode,
    config: (row.config ?? {}) as Record<string, string>,
    secrets: row.secretEnc ? openSecrets(row.secretEnc, key) : {},
  };
}

/** Tách trường theo manifest: thiếu trường bắt buộc → 422 `{ [field]: 'required' }`; trường lạ bỏ qua. */
export function splitFields(e: ConnectorEntry, fields: Record<string, string>) {
  const config: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const f of e.manifest.auth.fields) {
    const v = fields[f.key]?.trim() ?? '';
    if (!v && !f.optional) throw new AppError('VALIDATION_FAILED', 422, { [f.key]: 'required' });
    if (v) (f.secret ? secrets : config)[f.key] = v;
  }
  return { config, secrets };
}

export class ConnectionsService {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly platform: Pick<PlatformDb, 'tenantIntegrationRoute'>,
    private readonly key: Buffer,
    private readonly now: () => Date,
  ) {}

  /** Connector kết nối được (không "Sắp có") hoặc 422 `{ provider: 'coming_soon' }` — cùng mã với mock FE. */
  entry(provider: string): ConnectorEntry {
    const e = this.registry.get(provider);
    if (!e || !this.registry.isConnectable(provider)) throw new AppError('VALIDATION_FAILED', 422, { provider: 'coming_soon' });
    return e;
  }

  split(e: ConnectorEntry, fields: Record<string, string>) {
    return splitFields(e, fields);
  }

  async connect(tx: TenantTx, ws: string, userId: string, provider: string, fields: Record<string, string>) {
    const e = this.entry(provider);
    const { config, secrets } = this.split(e, fields);
    const mode = e.manifest.modes.includes('live') ? ('live' as const) : ('sandbox' as const);
    const existing = await tx.integrationConnection.findFirst({ where: { connectorKey: provider, ...IN_USE } });
    const id = existing?.id ?? uuidv7(this.now().getTime());
    if (e.adapter?.test) {
      try {
        await e.adapter.test({ id, mode, config, secrets });
      } catch {
        // Lý do từ provider có thể chứa dữ liệu nhạy cảm → không trả client.
        throw new AppError('VALIDATION_FAILED', 422, { provider: 'test_failed' });
      }
    }
    const data = {
      name: e.manifest.name,
      port: e.manifest.port,
      mode,
      status: 'connected' as const,
      config,
      secretEnc: new Uint8Array(sealSecrets(secrets, this.key)),
      lastError: null,
    };
    const row = existing
      ? await tx.integrationConnection.update({ where: { id }, data })
      : await tx.integrationConnection.create({ data: { id, connectorKey: provider, createdBy: userId, ...data } });
    await this.route(ws, row.id, provider, 'connected');
    return { row, existed: !!existing };
  }

  async disconnect(tx: TenantTx, ws: string, provider: string) {
    const row = await tx.integrationConnection.findFirst({ where: { connectorKey: provider, ...IN_USE } });
    if (!row) throw new AppError('NOT_FOUND', 404, { provider: 'not_connected' });
    await tx.integrationConnection.update({ where: { id: row.id }, data: { status: 'disconnected', secretEnc: null } });
    await this.route(ws, row.id, provider, 'disconnected');
    return row;
  }

  /** Route webhook ở DB nền tảng (`tenant_integration_route`) — idempotent theo connection_id. */
  private async route(ws: string, connectionId: string, connectorKey: string, status: string) {
    await this.platform.tenantIntegrationRoute.upsert({
      where: { connectionId },
      create: { connectionId, workspaceId: ws, connectorKey, status },
      update: { status },
    });
  }
}
