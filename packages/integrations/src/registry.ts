// DUY NHẤT nơi liệt kê connector (provider-ports → Hợp đồng). TIP chủ port gắn `adapter` vào đúng dòng của mình.
// `web_widget` ở trang Nền tảng kết nối là lối tắt sang kênh webchat (channelRegistry), không phải connector — DC-006.
import { defineConnectors } from './define';
import { comingSoonConnectors } from './coming-soon';
import { brevoManifest } from './connectors/brevo/manifest';
import { cassoManifest } from './connectors/casso/manifest';
import { sepayManifest } from './connectors/sepay/manifest';
import { smtpManifest } from './connectors/smtp/manifest';
import { MockBankFeedProvider } from './connectors/mock/bank-feed';
import { MockOrderSyncProvider, mockMarketplaceManifest } from './connectors/mock/order-sync';

export const connectorRegistry = defineConnectors([
  { manifest: brevoManifest }, // adapter: BrevoMailProvider (TIP-004)
  { manifest: smtpManifest }, // adapter: TIP-006 (DC-018)
  // Adapter `mock` (sandbox — provider-ports §9) tới khi TIP-010 / 032 gắn adapter thật SePay / Casso (Q-004).
  { manifest: sepayManifest, adapter: new MockBankFeedProvider(sepayManifest) },
  { manifest: cassoManifest, adapter: new MockBankFeedProvider(cassoManifest) },
  // Sàn thử nghiệm (ẩn — sandbox / test D31) tới khi có adapter thật Shopee / TikTok Shop / Sapo… (P2).
  { manifest: mockMarketplaceManifest, adapter: new MockOrderSyncProvider() },
  ...comingSoonConnectors.map((manifest) => ({ manifest })),
]);
