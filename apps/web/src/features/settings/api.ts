// Đọc Cài đặt (Blueprint §4.4 settings). Query key đầu = tên trong `invalidates` của action (workspace / members / …). Ghi qua useAction.
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type {
  AiAuditRow,
  AiSettings,
  AuditRow,
  Channel,
  Connector,
  FieldEntity,
  FieldsData,
  Governance,
  KbData,
  MembersPage,
  NotifPrefs,
  SlaData,
  Reply,
  RolesData,
  TagsData,
  Widget,
  WorkspaceData,
} from './types';

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

export const tagsQuery = (q: string) =>
  queryOptions({ queryKey: ['tags', 'settings', q], queryFn: () => transport.get<TagsData>('/settings/tags', q ? { q } : {}), placeholderData: (p) => p });

export const repliesQuery = (q: string) =>
  queryOptions({ queryKey: ['replies', 'settings', q], queryFn: () => transport.get<Reply[]>('/settings/replies', q ? { q } : {}), placeholderData: (p) => p });

export const fieldsQuery = (entity: FieldEntity) =>
  queryOptions({ queryKey: ['crm', 'settings-fields', entity], queryFn: () => transport.get<FieldsData>('/settings/fields', { entity }) });

export const aiSettingsQuery = () => queryOptions({ queryKey: ['ai', 'settings'], queryFn: () => transport.get<AiSettings>('/settings/ai') });

export const kbQuery = (p: { nav: string; folder: string | null; q: string }) =>
  queryOptions({
    queryKey: ['kb', 'settings', p],
    queryFn: () => transport.get<KbData>('/settings/kb', { nav: p.nav, ...(p.folder ? { folder: p.folder } : {}), ...(p.q ? { q: p.q } : {}) }),
    placeholderData: (prev) => prev,
  });

export const governanceQuery = () => queryOptions({ queryKey: ['ai', 'governance'], queryFn: () => transport.get<Governance>('/settings/governance') });

export const auditQuery = () => queryOptions({ queryKey: ['audit', 'workspace'], queryFn: () => transport.get<AuditRow[]>('/settings/audit') });

export const aiAuditQuery = () => queryOptions({ queryKey: ['audit', 'ai'], queryFn: () => transport.get<AiAuditRow[]>('/settings/ai-audit') });

export const slaQuery = () => queryOptions({ queryKey: ['settings', 'sla'], queryFn: () => transport.get<SlaData>('/settings/sla') });

export const notifPrefsQuery = () => queryOptions({ queryKey: ['me', 'notif-prefs'], queryFn: () => transport.get<NotifPrefs>('/settings/notifications') });
