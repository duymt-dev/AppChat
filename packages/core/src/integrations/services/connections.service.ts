// Kết nối connector của workspace (provider-ports §3, §4; TIP-012): kiểm trường theo manifest, tách bí mật → `secret_enc`
// (AES-256-GCM), kiểm thông tin qua adapter trước khi lưu, upsert theo connector, ghi route webhook ở DB nền tảng.
import { AppError } from '@appchat/shared';
import type { ConnectionCtx, ConnectionMode, ConnectorEntry, ConnectorRegistry } from '@appchat/integrations';
import type { PlatformDb } from '@appchat/db';
import { openSecrets, sealSecrets } from '../../kernel/crypto';
import { uuidv7 } from '../../kernel/ids';
import type { TenantTx } from '../../kernel/actions/action-context';
import { adapterOf, pickMode } from './adapter-selection';

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

/** Tách trường theo manifest: thiếu trường bắt buộc → 422 `{ [field]: 'required' }`; trường lạ bỏ qua; kiểm chéo `manifest.validate`. */
export function splitFields(e: ConnectorEntry, fields: Record<string, string>) {
  const config: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const f of e.manifest.auth.fields) {
    const v = fields[f.key]?.trim() ?? '';
    if (!v && !f.optional) throw new AppError('VALIDATION_FAILED', 422, { [f.key]: 'required' });
    if (v) (f.secret ? secrets : config)[f.key] = v;
  }
  const bad = e.manifest.validate?.({ config, secrets });
  if (bad) throw new AppError('VALIDATION_FAILED', 422, bad);
  return { config, secrets };
}

export class ConnectionsService {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly platform: Pick<PlatformDb, 'tenantIntegrationRoute'>,
    private readonly key: Buffer,
    private readonly now: () => Date,
    private readonly allowSandbox = true,
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

  /** Chế độ cho lần kết nối (giữ chế độ đã lưu khi kết nối lại mà không chọn) — 422 nếu manifest / môi trường không cho. */
  mode(e: ConnectorEntry, requested?: ConnectionMode, saved?: ConnectionMode): ConnectionMode {
    return pickMode(e, requested, saved, this.allowSandbox);
  }

  async connect(tx: TenantTx, ws: string, userId: string, provider: string, fields: Record<string, string>, requested?: ConnectionMode) {
    const e = this.entry(provider);
    const { config, secrets } = this.split(e, fields);
    const existing = await tx.integrationConnection.findFirst({ where: { connectorKey: provider, ...IN_USE } });
    const mode = this.mode(e, requested, existing?.mode);
    const id = existing?.id ?? uuidv7(this.now().getTime());
    const adapter = adapterOf(this.registry, provider, mode);
    if (adapter?.test) {
      try {
        await adapter.test({ id, mode, config, secrets });
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

  /**
   * Kiểm + mã hoá trước, KHÔNG ghi (action nền tảng — TIP-045b: pha nền tảng chỉ đọc tenant). Trả bản ghi đã mã hoá cho pha tenant.
   */
  async prepareConnect(read: Pick<TenantTx, 'integrationConnection'>, provider: string, fields: Record<string, string>, requested?: ConnectionMode) {
    const e = this.entry(provider);
    const { config, secrets } = this.split(e, fields);
    const existing = await read.integrationConnection.findFirst({ where: { connectorKey: provider, ...IN_USE }, select: { id: true, mode: true } });
    const mode = this.mode(e, requested, existing?.mode);
    const id = existing?.id ?? uuidv7(this.now().getTime());
    const adapter = adapterOf(this.registry, provider, mode);
    if (adapter?.test) {
      try {
        await adapter.test({ id, mode, config, secrets });
      } catch {
        throw new AppError('VALIDATION_FAILED', 422, { provider: 'test_failed' });
      }
    }
    return { id, provider, name: e.manifest.name, port: e.manifest.port, mode, config, secretEnc: Buffer.from(sealSecrets(secrets, this.key)).toString('base64') };
  }

  /** Pha tenant của `prepareConnect`: upsert kết nối theo id đã chọn (áp lại an toàn). */
  async applyConnect(tx: TenantTx, userId: string, p: Awaited<ReturnType<ConnectionsService['prepareConnect']>>) {
    const data = { name: p.name, port: p.port, mode: p.mode, status: 'connected' as const, config: p.config, secretEnc: new Uint8Array(Buffer.from(p.secretEnc, 'base64')), lastError: null };
    const existing = await tx.integrationConnection.findUnique({ where: { id: p.id }, select: { id: true } });
    return existing
      ? tx.integrationConnection.update({ where: { id: p.id }, data })
      : tx.integrationConnection.create({ data: { id: p.id, connectorKey: p.provider, createdBy: userId, ...data } });
  }

  /** Route webhook trong transaction nền tảng của người gọi. */
  async routeIn(ptx: Pick<PlatformDb, 'tenantIntegrationRoute'>, ws: string, connectionId: string, connectorKey: string, status: string) {
    await ptx.tenantIntegrationRoute.upsert({ where: { connectionId }, create: { connectionId, workspaceId: ws, connectorKey, status }, update: { status } });
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
