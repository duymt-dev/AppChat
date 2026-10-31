// Bề mặt công khai của domain `sales` cho apps (controller api, worker) và domain khác (hợp đồng / đơn TIP-030, 031 tạo từ báo giá).
export { QuotesReadService, type QuoteViewer } from './quotes/services/quotes-read.service';
export type { QuoteFilter } from './quotes/repos/quotes.repo';
export { QuoteDeps } from './quotes/services/quote-deps';
export { quoteToken, readQuoteToken } from './quotes/services/quote-link';
export { sweepQuotes, quoteOwnerConsumer, QUOTE_SWEEP_JOB, SALES_SCHEDULER_QUEUE } from './jobs/sales.jobs.module';
export { expireDue, remindExpiring, markViewed, moveOpenQuotes } from './quotes/services/quote-system';
export { intentByRules, matchCatalog, parseIntent } from './quotes/services/quote-draft';
export { customerConversation, postToCustomer, reachCustomer, type QuoteChannel as CustomerChannel } from './quotes/services/quote-send';
