// API công khai của domain crm cho apps/api + domain khác (inbox pipeline — C06; scope khách cho sales / booking).
export { CrmReadService, type Viewer as CrmViewer } from './services/crm-read.service';
export { CrmMembers } from './services/members.service';
export { ContactIdentityService, type InboundIdentity, type ResolvedContact } from './services/identity.service';
export { scopeSql as crmScopeSql, visibleContact, editableContact, actorUserId } from './services/access';
export { writeTimeline, type TimelineInput } from './services/timeline.service';
export { applyStageRule, type StageRule } from './services/stage-rules';
export { CRM_SEED } from './seeds';
export type { ContactFilter } from './repos/contacts.repo';
export { fieldDefs } from './services/fields.service';
export { createContact } from './services/contacts.service';
export { MEMORY_CAP, normFact } from './memory/normalize';
export { purgeMergeReceipts, MERGE_UNDO_MS } from './memory/merge';
export { recentFacts } from './memory/read';
// Việc dữ liệu nặng của crm (TIP-045b annex D) — worker đăng ký qua CrmJobsModule; test dựng runner trực tiếp.
export { registerContactExportKind, CONTACT_EXPORT_KIND } from './jobs/contact-export.processor';
export { CONTACT_BULK_KIND } from './actions/contact-bulk.handler';
