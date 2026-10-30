// Public API của module agents.
export { AgentsScreen } from './screens/AgentsScreen';
export { AgentBuilderScreen } from './screens/AgentBuilderScreen';
// Dùng chung cho nơi cần chọn AI Agent (vd. menu "Phân công" ở Hộp thư — REQ-C10).
export { agentsQuery, metaQuery as agentsMetaQuery } from './api';
export type { Agent, AgentsMeta } from './types';
