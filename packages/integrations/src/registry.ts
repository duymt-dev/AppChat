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

export const connectorRegistry = defineConnectors([
  { manifest: brevoManifest }, // adapter: BrevoMailProvider (TIP-004)
  { manifest: smtpManifest }, // adapter: TIP-006 (DC-018)
  // TIP-012b: live = adapter thật (không lùi về mock); sandbox = giả lập HMAC `x-mock-signature` chỉ cho test / dev (core chặn ở production).
  { manifest: sepayManifest, adapters: { live: new SepayBankFeed(sepayManifest), sandbox: new MockBankFeedProvider(sepayManifest) } },
  { manifest: cassoManifest, adapters: { live: new CassoBankFeed(cassoManifest), sandbox: new MockBankFeedProvider(cassoManifest) } },
  // Sàn thử nghiệm (ẩn — sandbox / test D31) tới khi có adapter thật Shopee / TikTok Shop / Sapo… (P2).
  { manifest: mockMarketplaceManifest, adapters: { sandbox: new MockOrderSyncProvider() } },
  ...comingSoonConnectors.map((manifest) => ({ manifest })),
]);
