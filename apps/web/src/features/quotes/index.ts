// Public API của module quotes.
export { QuotesScreen } from './screens/QuotesScreen';
export { PublicQuoteScreen } from './screens/PublicQuoteScreen';
export { quotesQuery, latestQuoteByContactQuery } from './api';
export type { Quote } from './types';
// Dùng từ Hồ sơ 360° (REQ-F11: 6 nút mở form tại chỗ).
export { QuoteFormModal } from './components/QuoteFormModal';
export { useQuotesUi } from './quotes-store';
export { prefillQuotesForm } from './ui-commands';
