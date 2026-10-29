import type { IconName } from '@appchat/ui';

export interface StatCard {
  label: string;
  value: string;
  tone: 'up' | 'warn' | 'muted';
  note: string;
  icon: IconName;
}

export interface ConnectChip {
  name: string;
  meta: string;
  warn: boolean;
}

export interface ConnectGroup {
  key: 'in' | 'out' | 'erp' | 'data';
  items: ConnectChip[];
}

export interface AgentCard {
  icon: IconName;
  name: string;
  status: string;
  desc: string;
  sessions: string;
  auto: string;
}

export interface OnboardingStep {
  key: 'channel' | 'ai' | 'team' | 'template' | 'sla';
  icon: IconName;
  title: string;
  desc: string;
  cta: string;
  done: boolean;
}

export interface FollowUp {
  id: string;
  name: string;
  initial: string;
  avatar: string;
  channel: string;
  channel_bg: string;
  stage: string;
  stage_color: string;
  service: string;
  due: string;
  overdue: boolean;
}

export interface NewsItem {
  tag: string;
  date: string;
  title: string;
  desc: string;
  color: string;
}

export interface NotificationItem {
  icon: IconName;
  color: string;
  text: string;
  time: string;
  unread: boolean;
}

export interface DashboardData {
  stats: StatCard[];
  connect_groups: ConnectGroup[];
  agents: AgentCard[];
  modules: string[];
  cdp: string[];
  onboarding: { steps: OnboardingStep[]; done_count: number };
  follow_ups: FollowUp[];
  news: NewsItem[];
  notifications: NotificationItem[];
}
