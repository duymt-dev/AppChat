// Kiểu Tổng quan = shape `GET /v1/dashboard` dùng chung (packages/shared/src/api/dashboard.ts) — mock và API thật parse cùng schema.
import type { IconName } from '@appchat/ui';
import type { DashboardDto, FollowUpItemDto, WorkItemDto } from '@appchat/shared';

type WithIcon<T> = Omit<T, 'icon'> & { icon: IconName };

export type StatCard = WithIcon<DashboardDto['stats'][number]>;
export type ConnectGroup = DashboardDto['connect_groups'][number];
export type ConnectChip = ConnectGroup['items'][number];
export type AgentCard = WithIcon<DashboardDto['agents'][number]>;
export type OnboardingStep = WithIcon<DashboardDto['onboarding']['steps'][number]>;
export type FollowUp = FollowUpItemDto;
export type WorkItem = WorkItemDto;
export type NewsItem = DashboardDto['news'][number];
export type NotificationItem = WithIcon<DashboardDto['notifications'][number]>;
export type AiToday = DashboardDto['ai_today'];
export type CreditInfo = NonNullable<DashboardDto['credit']>;

export interface DashboardData extends Omit<DashboardDto, 'stats' | 'agents' | 'onboarding' | 'notifications'> {
  stats: StatCard[];
  agents: AgentCard[];
  onboarding: { steps: OnboardingStep[]; done_count: number };
  notifications: NotificationItem[];
}
