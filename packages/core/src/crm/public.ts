// API công khai của domain crm cho apps/api + domain khác (inbox pipeline — C06; scope khách cho sales / booking).
export { CrmReadService, type Viewer as CrmViewer } from './services/crm-read.service';
export { CrmMembers } from './services/members.service';
export { loadOf as assigneeLoadOf } from './routing/routing-selector';
export { ContactIdentityService, type InboundIdentity, type ResolvedContact } from './services/identity.service';
export type { IdentityMatch } from './services/identity-match';
export { scopeSql as crmScopeSql, visibleContact, editableContact, actorUserId } from './services/access';
export { writeTimeline, type TimelineInput } from './services/timeline.service';
export { applyStageRule, type StageRule } from './services/stage-rules';
export { CRM_SEED } from './seeds';
export type { ContactFilter } from './repos/contacts.repo';
export { where as contactWhereSql } from './repos/contacts.repo';
export { fieldDefs } from './services/fields.service';
export { createContact } from './services/contacts.service';
export { MEMORY_CAP, normFact } from './memory/normalize';
export { purgeMergeReceipts, MERGE_UNDO_MS } from './memory/merge';
export { recentFacts } from './memory/read';
// Việc dữ liệu nặng của crm (TIP-045b annex D) — worker đăng ký qua CrmJobsModule; test dựng runner trực tiếp.
export { registerContactExportKind, CONTACT_EXPORT_KIND } from './jobs/contact-export.processor';
export { registerTimelineExportKind, TIMELINE_EXPORT_KIND } from './jobs/contact-timeline-export.processor';
export { CONTACT_BULK_KIND } from './actions/contact-bulk.handler';
// Chia lead mới (TIP-042b): đọc cấu hình cho controller Cài đặt; consumer + actor system cho test.
export { LeadRoutingReadService } from './routing/routing-read.service';
export { LEAD_ROUTING_CONSUMER, leadRoutingConsumer, leadRoutingCtx } from './routing/routing-consumer';
export { LEAD_ROUTING_ACTOR, LEAD_ROUTING_TOPIC } from './routing/routing-apply.handler';
// TIP-015f: thùng rác khách (cùng reader với action contact.deleted_list).
export { deletedContacts } from './lifecycle/read';
export { duplicateCandidates } from './merge/candidates';
export { purgeMergeReceiptPayloads } from './merge/purge';
