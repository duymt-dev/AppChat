'use client';
import { useQuery } from '@tanstack/react-query';
import type { ListEnvelope } from '@appchat/shared';
import { transport } from '../api/client';
import { qk } from '../api/query-keys';

export interface MeWorkspace {
  id: string;
  name: string;
  initial: string;
  kind: 'personal' | 'team' | 'business';
  plan: string;
  color: string;
}

export interface Me {
  user: { id: string; name: string; initial: string; phone: string; title: string; locale: string; email: string };
  workspaces: MeWorkspace[];
  current_workspace_id: string;
  billing: { trial_days_left: number; paid_plan: string; wallet_balance: string };
}

export interface NotificationItem {
  id: string;
  icon: string;
  tone: 'warn' | 'danger' | 'info' | 'teal';
  title: string;
  ago: string;
}

export const useMe = () => useQuery({ queryKey: qk.me(), queryFn: () => transport.get<Me>('/me') });

export const useNavBadges = () =>
  useQuery({ queryKey: qk.navBadges(), queryFn: () => transport.get<Record<string, number>>('/nav/badges') });

export const useNotifications = () =>
  useQuery({
    queryKey: qk.notifications(),
    queryFn: () => transport.get<ListEnvelope<NotificationItem>>('/notifications'),
  });
