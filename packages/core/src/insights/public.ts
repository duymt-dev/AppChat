// API công khai của domain insights cho apps/api (controller) + worker + test. Một dòng re-export ở src/index.ts (facade).
export { InsightsService } from './metrics/registry';
export { InsightsReadService, type InsightViewer } from './services/insights-read.service';
export { agentStats } from './services/agent-stats';
export { insightAuthz } from './metrics/common';
