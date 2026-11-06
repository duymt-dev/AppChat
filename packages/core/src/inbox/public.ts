// API công khai của domain inbox cho apps/api (controller) + domain khác (crm chuyển phụ trách kèm hội thoại).
export { InboxReadService, type Viewer as InboxViewer } from './services/read.service';
export { InboxMetaService } from './services/meta.service';
export { InboundPipeline, wantsAgent } from './services/pipeline';
export { INBOX_RUNTIME } from './jobs/inbox.jobs.module';
export type { ConvFilter } from './repos/conversations.repo';
export { visibleConversation, writableConversation } from './services/access';
// Gửi tin ra kênh từ domain khác (báo giá gửi khách — TIP-029): ghi tin + outbox trong transaction, đẩy hàng đợi sau commit.
export { writeOutgoing, enqueueOutgoing, sendableAccount, type Outgoing } from './services/outbound';
export { scopeCols } from './services/access';
export { senderOf } from './actions/message.handlers';
// TIP-022b: tóm tắt bàn giao chiếu theo quyền người xem.
export { readHandoffSummary } from './services/handoff-summary-read';
