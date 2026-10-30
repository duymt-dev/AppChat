// API công khai của domain inbox cho apps/api (controller) + domain khác (crm chuyển phụ trách kèm hội thoại).
export { InboxReadService, type Viewer as InboxViewer } from './services/read.service';
export { InboxMetaService } from './services/meta.service';
export { InboundPipeline } from './services/pipeline';
export { INBOX_RUNTIME } from './jobs/inbox.jobs.module';
export type { ConvFilter } from './repos/conversations.repo';
