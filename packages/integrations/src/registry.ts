// DUY NHẤT nơi liệt kê connector (provider-ports → Hợp đồng). TIP chủ port gắn `adapter` vào đúng dòng của mình.
// `web_widget` ở trang Nền tảng kết nối là lối tắt sang kênh webchat (channelRegistry), không phải connector — DC-006.
import { defineConnectors } from './define';
import { comingSoonConnectors } from './coming-soon';
import { brevoManifest } from './connectors/brevo/manifest';
import { cassoManifest } from './connectors/casso/manifest';
import { sepayManifest } from './connectors/sepay/manifest';
import { smtpManifest } from './connectors/smtp/manifest';

export const connectorRegistry = defineConnectors([
  { manifest: brevoManifest }, // adapter: BrevoMailProvider (TIP-004)
  { manifest: smtpManifest }, // adapter: TIP-006 (DC-018)
  { manifest: sepayManifest }, // adapter: TIP-010
  { manifest: cassoManifest }, // adapter: TIP-010
  ...comingSoonConnectors.map((manifest) => ({ manifest })),
]);
