// Tab Hồ sơ 360° theo bố cục của vai trò người xem (REQ-F12, TIP-026): API thật trả `layout` kèm hồ sơ; mock (không có `layout`)
// dùng mẫu gán cho vai trò hiện tại ở `/settings/profile-layouts`. Tab tắt bị ẩn; thiếu bố cục → 5 tab mặc định.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthz } from '@/shared/authz/useCan';
import { profileLayoutsQuery } from '@/features/settings';
import { contactQuery } from '../api';
import type { LayoutTab } from '../types';

const DEFAULT: LayoutTab[] = (['overview', 'crm', 'ai', 'files', 'history'] as const).map((key, sort) => ({ key, label: '', enabled: true, sort, builtin: true, blocks: [] }));

export function useProfileTabs(contactId: string): LayoutTab[] {
  const own = useQuery({ ...contactQuery(contactId), enabled: !!contactId }).data?.layout;
  const role = useAuthz().data?.role;
  const all = useQuery({ ...profileLayoutsQuery(), enabled: !!contactId && !own }).data;
  const fallback = all && role ? all.layouts.find((l) => l.id === all.role_assignments[role as keyof typeof all.role_assignments]) : undefined;
  const tabs = (own ?? fallback)?.tabs ?? DEFAULT;
  const on = tabs.filter((t) => t.enabled).sort((a, b) => a.sort - b.sort);
  return on.length ? on : DEFAULT;
}
