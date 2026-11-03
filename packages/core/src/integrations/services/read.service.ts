// Đọc trang Nền tảng kết nối (GET /v1/settings/integrations — shape packages/shared/src/api/integrations.ts): thẻ `web_widget`
// (lối tắt kênh webchat — DC-006) + mọi manifest; `connected` theo DB tenant, `interest` theo DB nền tảng.
import type { ConnectorDto } from '@appchat/shared';
import type { ConnectorRegistry } from '@appchat/integrations';
import { formFields } from './form-schema';
import type { PlatformDb, TenantDb } from '@appchat/db';

/** Thẻ "Trợ lý AI" (prototype Nền tảng kết nối) mở Cài đặt › Web widget; luôn sẵn — widget là kênh của workspace. */
const WEB_WIDGET: ConnectorDto = {
  key: 'web_widget',
  name: 'Trợ lý AI',
  group: 'channels_studio',
  color: '#2DC56A',
  status: 'ga',
  connected: true,
  opens: 'web_widget',
  fields: [],
  interest: false,
};

export class IntegrationsReadService {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly platform: Pick<PlatformDb, 'integrationInterest'>,
  ) {}

  async list(db: Pick<TenantDb, 'integrationConnection'>, workspaceId: string): Promise<ConnectorDto[]> {
    const [rows, interests] = await Promise.all([
      db.integrationConnection.findMany({ where: { status: 'connected' }, select: { connectorKey: true } }),
      this.platform.integrationInterest.findMany({ where: { workspaceId }, select: { connectorKey: true } }),
    ]);
    const on = new Set(rows.map((r) => r.connectorKey));
    const wanted = new Set(interests.map((r) => r.connectorKey));
    return [
      WEB_WIDGET,
      ...this.registry.listed().map((m) => ({
        key: m.key,
        name: m.name,
        group: m.group,
        color: m.color,
        status: m.status,
        connected: on.has(m.key),
        opens: null,
        fields: m.auth.fields.map((f) => f.key),
        auth: formFields({ manifest: m }),
        interest: wanted.has(m.key),
      })),
    ];
  }
}
