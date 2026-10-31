// Đọc Cài đặt (Blueprint §4.4 settings). Query key đầu = tên trong `invalidates` của action (workspace / members / …). Ghi qua useAction.
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type {
  DocTemplate,
  BillInvoice,
  BillingCatalog,
  BillingSummary,
  WalletData,
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
  ProfileLayoutsData,
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

export interface ChannelLoginState {
  account_id: string;
  status: 'starting' | 'waiting' | 'scanned' | 'connected' | 'expired' | 'declined' | 'failed';
  /** PNG base64 khi `waiting`. */
  qr: string | null;
  expires_at: string | null;
}
const DONE: ChannelLoginState['status'][] = ['connected', 'expired', 'declined', 'failed'];

export interface ChannelAccountStats {
  account_id: string;
  days: { day: number; convs: number; frt_sec: number }[];
  total_convs: number;
}

export const channelAccountStatsQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['channels', 'settings', 'stats', accountId],
    queryFn: () => transport.get<ChannelAccountStats>(`/settings/channels/${accountId}/stats`, { days: 7 }),
    enabled: !!accountId,
  });

/** Trạng thái đăng nhập QR của tài khoản Zalo đang kết nối (TIP-014) — poll tới khi `connected` / hết hạn. */
export const channelLoginQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['channels', 'settings', 'login', accountId],
    queryFn: () => transport.get<ChannelLoginState>(`/settings/channels/${accountId}/login`),
    enabled: !!accountId,
    refetchInterval: (q) => (q.state.data && DONE.includes(q.state.data.status) ? false : 1500),
  });

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
    // Tài liệu đang nạp ở worker (http) → hỏi lại tới khi xong (FE chưa có kênh realtime `kb.source`).
    refetchInterval: (q) => (q.state.data?.data.some((d) => d.status === 'pending' || d.status === 'processing') ? 2000 : false),
  });

export const governanceQuery = () => queryOptions({ queryKey: ['ai', 'governance'], queryFn: () => transport.get<Governance>('/settings/governance') });

export const auditQuery = () => queryOptions({ queryKey: ['audit', 'workspace'], queryFn: () => transport.get<AuditRow[]>('/settings/audit') });

export const aiAuditQuery = () => queryOptions({ queryKey: ['audit', 'ai'], queryFn: () => transport.get<AiAuditRow[]>('/settings/ai-audit') });

export const slaQuery = () => queryOptions({ queryKey: ['settings', 'sla'], queryFn: () => transport.get<SlaData>('/settings/sla') });

export const notifPrefsQuery = () => queryOptions({ queryKey: ['me', 'notif-prefs'], queryFn: () => transport.get<NotifPrefs>('/settings/notifications') });

export const billingSummaryQuery = () => queryOptions({ queryKey: ['billing', 'summary'], queryFn: () => transport.get<BillingSummary>('/billing/summary') });

export const billingPlansQuery = () =>
  queryOptions({ queryKey: ['billing', 'plans'], queryFn: () => transport.get<BillingCatalog>('/billing/plans'), staleTime: Infinity });

export const walletQuery = () => queryOptions({ queryKey: ['billing', 'wallet'], queryFn: () => transport.get<WalletData>('/billing/wallet') });

export const billInvoicesQuery = (p: { status: string; q: string }) =>
  queryOptions({
    queryKey: ['billing', 'invoices', p],
    queryFn: () => transport.get<{ data: BillInvoice[] }>('/billing/invoices', { status: p.status, ...(p.q ? { q: p.q } : {}) }),
    placeholderData: (prev) => prev,
  });

export const profileLayoutsQuery = () =>
  queryOptions({ queryKey: ['profile_layouts'], queryFn: () => transport.get<ProfileLayoutsData>('/settings/profile-layouts') });

export const docTemplatesQuery = (kind: string) =>
  queryOptions({
    queryKey: ['doc_templates', kind],
    queryFn: () => transport.get<{ data: DocTemplate[] }>('/doc-templates', kind === 'all' ? {} : { kind }),
  });
