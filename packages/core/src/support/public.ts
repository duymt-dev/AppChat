// API công khai của domain support cho apps/api (controller) + worker + test. Một dòng re-export ở src/index.ts (facade).
export { TicketsReadService, type TicketViewer, type TicketFilter } from './services/tickets-read.service';
export {
  SlaCalendar,
  defaultPolicy,
  ensureSlaPolicies,
  resolveSlaPolicyFromList,
  resolveAccountSlaPolicy,
  targetsFor,
  DEFAULT_SLA_POLICY_ID,
  type SlaPolicyRecord,
} from './services/sla-clock';
export { sweepSla, onCustomerMessage, onAgentReply } from './services/support-system';
export { sweepSupport, supportConsumer, SLA_SWEEP_JOB, SUPPORT_SCHEDULER_QUEUE } from './jobs/support.jobs.module';
// TIP-022b: consumer khiếu nại từ lượt agent (test / worker ROLE=jobs).
export { aiComplaintConsumer, AI_COMPLAINT_CONSUMER } from './events/ai-complaint.consumer';
// TIP-034b: từ điển gợi ý danh mục ticket (controller + test).
export { TicketCategoriesRead, CategoryCursors, scopeGeneration, usedLabels, USED_PAGE, type CategoryViewer } from './categories/read';
export { readCategoryConfig } from './categories/repository';
// TIP-034d: quan sát tồn ticket (job chụp / dọn + đọc so sánh + kết quả đóng băng).
export { captureStock } from './trends/snapshot';
export { readStockSummary, baselineOf, stockReadSql } from './trends/read';
export { stockRefSource } from './trends/providers';
export { materializeStockResult, stockResultReadable } from './trends/projection';
export { pruneStockBatch, eraseStockForTicket } from './trends/cleanup';
export { observeAll, observeWorkspace, STOCK_OBSERVE_JOB } from './trends/installer';
