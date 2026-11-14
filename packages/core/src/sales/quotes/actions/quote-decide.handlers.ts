// quote.mark_accepted · mark_rejected · request_revision (COMMERCE §3, §8; D46) — facade: ba handler đã tách sang `../decisions/*`
// (TIP-022c §Rà 3 — mỗi quyết định một file + cổng ý định khách dùng chung). Giữ đường import cũ cho SalesModule / job hết hạn (closeLost).
export { QuoteAcceptHandler } from '../decisions/accept.handler';
export { QuoteRejectHandler } from '../decisions/reject.handler';
export { QuoteRevisionHandler } from '../decisions/revision.handler';
export { closeLost } from '../decisions/shared';
