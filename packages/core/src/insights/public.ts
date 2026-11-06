// API công khai của domain insights cho apps/api (controller) + worker + test. Một dòng re-export ở src/index.ts (facade).
export { InsightsService } from './metrics/registry';
export { InsightsReadService, type InsightViewer } from './services/insights-read.service';
export { agentStats } from './services/agent-stats';
export { insightAuthz } from './metrics/common';
export { DashboardService, type DashboardViewer } from './services/dashboard.service';
export { workItems, countByType } from './services/work-items';
export { visibleFollowUps, seedDue, supersedeStale, FOLLOW_UP_DAYS } from './services/follow-ups';
export { FOLLOW_UP_ACTOR } from './actions/follow-up.handlers';
export { sweepFollowUps, followUpCtx, FOLLOW_UP_SWEEP_JOB, INSIGHTS_SCHEDULER_QUEUE } from './jobs/follow-up.consumer';
export { eventRecordVisible } from './services/renewal-suggestions';
export { registerListExportKinds, buildExport, exportStamp, READERS as LIST_EXPORT_READERS, EXPORT_TTL_MS as LIST_EXPORT_TTL_MS } from './exports/export-runner';
export { XLSX_MIME } from './exports/export-columns';
