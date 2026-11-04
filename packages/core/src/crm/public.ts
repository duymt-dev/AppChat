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
export { ContactMemoryModule } from './memory/memory.module';
export { MEMORY_CAP, normFact } from './memory/normalize';
export { purgeMergeReceipts, MERGE_UNDO_MS } from './memory/merge';
export { recentFacts } from './memory/read';
