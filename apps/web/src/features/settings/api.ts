// Đọc Cài đặt (Blueprint §4.4 settings). Query key đầu = tên trong `invalidates` của action (workspace / members / …). Ghi qua useAction.
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Channel, Connector, MembersPage, RolesData, Widget, WorkspaceData } from './types';

export const workspaceQuery = () =>
  queryOptions({ queryKey: ['workspace', 'settings'], queryFn: () => transport.get<WorkspaceData>('/settings/workspace') });

export const membersQuery = (q: string) =>
  queryOptions({
    queryKey: ['members', 'list', q],
    queryFn: () => transport.get<MembersPage>('/settings/members', q ? { q } : {}),
    placeholderData: (prev) => prev,
  });

export const channelsQuery = (filter: 'all' | 'on' | 'off') =>
  queryOptions({ queryKey: ['channels', 'settings', filter], queryFn: () => transport.get<Channel[]>('/settings/channels', { filter }) });

export const connectorsQuery = () =>
  queryOptions({ queryKey: ['integrations', 'list'], queryFn: () => transport.get<Connector[]>('/settings/integrations') });

export const widgetQuery = () =>
  queryOptions({ queryKey: ['channels', 'widget'], queryFn: () => transport.get<Widget>('/settings/widget') });

export const rolesQuery = () => queryOptions({ queryKey: ['members', 'roles'], queryFn: () => transport.get<RolesData>('/settings/roles') });
