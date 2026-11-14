'use client';
import { useQuery } from '@tanstack/react-query';
import type { ListEnvelope, NavBadgesDto } from '@appchat/shared';
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

// Số đếm rail theo quyền + scope (TIP-016b): khoá vắng = không có quyền module. Làm mới khi realtime báo đổi (event-invalidation —
// tin / hội thoại / ticket / lịch hẹn); server cache 15 giây nhưng bỏ cache ngay khi có event đổi số.
export const useNavBadges = () =>
  useQuery({ queryKey: qk.navBadges(), queryFn: () => transport.get<NavBadgesDto>('/nav/badges'), staleTime: 15_000 });

export const useNotifications = () =>
  useQuery({
    queryKey: qk.notifications(),
    // Popover chuông chỉ hiện thông báo chưa đọc ("Đánh dấu đã đọc" → danh sách rỗng) — Blueprint §4.4 `?unread=`.
    queryFn: () => transport.get<ListEnvelope<NotificationItem>>('/notifications', { unread: true }),
  });
