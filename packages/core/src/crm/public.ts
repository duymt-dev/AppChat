// API công khai của domain crm cho apps/api + domain khác (inbox pipeline — C06; scope khách cho sales / booking).
export { CrmReadService, type Viewer as CrmViewer } from './services/crm-read.service';
export { CrmMembers } from './services/members.service';
export { ContactIdentityService, type InboundIdentity, type ResolvedContact } from './services/identity.service';
export { scopeSql as crmScopeSql, visibleContact, editableContact } from './services/access';
export { writeTimeline, type TimelineInput } from './services/timeline.service';
export { CRM_SEED } from './seeds';
export type { ContactFilter } from './repos/contacts.repo';
