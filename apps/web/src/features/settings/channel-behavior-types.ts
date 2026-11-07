// Hành vi agent trực kênh của một tài khoản (TIP-022b): lịch tuần có cấu trúc, phân luồng từ khoá, bật lời chào — shape chung với API
// (`@appchat/shared` agent-channel-behavior). Tách file để channel-types.ts giữ gọn.
import type { ChannelAgentBehaviorDto, ChannelRoutingDto, RoutingCandidateDto, WeeklyScheduleDto } from '@appchat/shared';

export type WeeklySchedule = WeeklyScheduleDto;
export type KeywordRouting = ChannelRoutingDto;
export type RoutingCandidate = RoutingCandidateDto;
export type ChannelAgentBehavior = ChannelAgentBehaviorDto;

export const emptyBehavior = (): ChannelAgentBehavior => ({ schedule: null, routing: { enabled: false, candidates: [] }, greeting_enabled: false });
