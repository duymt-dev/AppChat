// DUY NHẤT nơi liệt kê connector (provider-ports → Hợp đồng). TIP chủ port gắn `adapter` vào đúng dòng của mình.
// `web_widget` ở trang Nền tảng kết nối là lối tắt sang kênh webchat (channelRegistry), không phải connector — DC-006.
import { defineConnectors } from './define';
import { comingSoonConnectors } from './coming-soon';
import { brevoManifest } from './connectors/brevo/manifest';
import { cassoManifest } from './connectors/casso/manifest';
import { sepayManifest } from './connectors/sepay/manifest';
import { smtpManifest } from './connectors/smtp/manifest';
import { MockBankFeedProvider } from './connectors/mock/bank-feed';
import { SepayBankFeed } from './connectors/sepay/adapter';
import { CassoBankFeed } from './connectors/casso/adapter';
import { MockOrderSyncProvider, mockMarketplaceManifest } from './connectors/mock/order-sync';
import { BrevoTenantMail } from './connectors/brevo/tenant-adapter';
import { SmtpTenantMail } from './connectors/smtp/tenant-adapter';

export const connectorRegistry = defineConnectors([
  // TIP-012c: adapter mail của DN (kết nối tenant). Thư hệ thống nền tảng vẫn BrevoMailProvider / SmtpMailProvider qua env (tách hẳn).
  { manifest: brevoManifest, adapters: { live: new BrevoTenantMail(brevoManifest) } },
  { manifest: smtpManifest, adapters: { live: new SmtpTenantMail(smtpManifest) } },
  // TIP-012b: live = adapter thật (không lùi về mock); sandbox = giả lập HMAC `x-mock-signature` chỉ cho test / dev (core chặn ở production).
  { manifest: sepayManifest, adapters: { live: new SepayBankFeed(sepayManifest), sandbox: new MockBankFeedProvider(sepayManifest) } },
  { manifest: cassoManifest, adapters: { live: new CassoBankFeed(cassoManifest), sandbox: new MockBankFeedProvider(cassoManifest) } },
  // Sàn thử nghiệm (ẩn — sandbox / test D31) tới khi có adapter thật Shopee / TikTok Shop / Sapo… (P2).
  { manifest: mockMarketplaceManifest, adapters: { sandbox: new MockOrderSyncProvider() } },
  ...comingSoonConnectors.map((manifest) => ({ manifest })),
]);
