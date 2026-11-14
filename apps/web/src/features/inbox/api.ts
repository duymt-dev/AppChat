// Đọc hộp thư (Blueprint §4.4 inbox). Ghi chỉ qua useAction (packages/actions/src/inbox.ts).
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { AgentToolsDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import type { ChannelAccount, ChannelMeta, ChannelType, ConnectChannel, Contact360, Conversation, FolderCounts, GroupInfo, HandoffSummary, ThreadData } from './types';

/** Bộ lọc danh sách gửi lên API (TIP-025): thư mục / kênh / tài khoản / tìm kiếm / sắp xếp. */
export interface ConvParams {
  folder?: string;
  channel?: string;
  channel_account_id?: string;
  q?: string;
  sort?: 'latest' | 'unread';
}

/** Khoá FE (tab trên, rail thư mục, chip kênh, tài khoản, sắp xếp) → tham số API. `ch_<kênh>` = lọc kênh; `saved_*` (bộ lọc đã lưu — chưa có dữ liệu) = tất cả. */
export function convParams(f: { tab: string; channel: ChannelType | null; accountId: string | null; q: string; sort: string }): ConvParams {
  const out: ConvParams = {};
  let channel: string | null = f.channel;
  if (f.tab.startsWith('ch_')) channel = f.tab.slice(3);
  else if (f.tab !== 'all' && !f.tab.startsWith('saved_')) out.folder = f.tab;
  if (channel) out.channel = channel;
  if (f.accountId) out.channel_account_id = f.accountId;
  const q = f.q.trim();
  if (q) out.q = q;
  if (f.sort === 'unread') out.sort = 'unread';
  return out;
}

export const inboxKeys = {
  all: ['inbox'] as const,
  list: (p: ConvParams) => ['inbox', 'conversations', p] as const,
  counts: (p: CountParams = {}) => ['inbox', 'counts', p] as const,
  conv: (id: string) => ['inbox', 'conversation', id] as const,
  thread: (id: string) => ['inbox', 'messages', id] as const,
};

const staticOpts = { staleTime: Infinity } as const;

type ConvPage = { data: Conversation[]; next_cursor: string | null };

/** Danh sách hội thoại theo trang (50 / trang, cursor) — cuộn cuối danh sách tải thêm. */
export const conversationsQuery = (p: ConvParams = {}) =>
  infiniteQueryOptions({
    queryKey: inboxKeys.list(p),
    queryFn: ({ pageParam }) => transport.get<ConvPage>('/conversations', { ...p, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });

/** Một hội thoại (deep link `?c=` khi không nằm trong trang đang xem). */
export const conversationQuery = (id: string) => queryOptions({ queryKey: inboxKeys.conv(id), queryFn: () => transport.get<Conversation | null>(`/conversations/${id}`) });

export interface ThreadHit {
  message_id: string;
  body: string;
  sender: 'contact' | 'user' | 'agent' | 'system';
  time: string;
  ranges: [number, number][];
}

/** Tìm trong hội thoại (REQ-C12) — không dấu ở backend. */
export const threadSearchQuery = (id: string, q: string, sender: string) =>
  queryOptions({ queryKey: ['inbox', 'messages', id, 'search', { q, sender }], queryFn: () => transport.get<ThreadHit[]>(`/conversations/${id}/messages/search`, { q, sender }), enabled: !!q.trim() });

/** Bộ lọc của đếm thư mục = bộ lọc danh sách trừ thư mục / sắp xếp (TIP-025b §B.4 — đếm khớp phần đang lọc). */
export type CountParams = Omit<ConvParams, 'folder' | 'sort'>;
export const countParams = ({ folder: _f, sort: _s, ...rest }: ConvParams): CountParams => rest;
export const countsQuery = (p: CountParams = {}) =>
  queryOptions({ queryKey: inboxKeys.counts(p), queryFn: () => transport.get<FolderCounts>('/conversations/counts', p), placeholderData: (prev) => prev });

/** TIP-022b: tóm tắt bàn giao có cấu trúc (chiếu theo quyền người xem); null khi chưa có. */
export const handoffSummaryQuery = (id: string) =>
  queryOptions({ queryKey: [...inboxKeys.conv(id), 'handoff-summary'] as const, queryFn: () => transport.get<HandoffSummary | null>(`/conversations/${id}/handoff-summary`) });

export const threadQuery = (id: string) =>
  queryOptions({ queryKey: inboxKeys.thread(id), queryFn: () => transport.get<ThreadData>(`/conversations/${id}/messages`) });

export const accountsQuery = () =>
  queryOptions({ queryKey: ['channels', 'accounts'], queryFn: () => transport.get<ChannelAccount[]>('/inbox/accounts'), ...staticOpts });

export const channelsQuery = () =>
  queryOptions({ queryKey: ['channels', 'meta'], queryFn: () => transport.get<Record<ChannelType, ChannelMeta>>('/inbox/channels'), ...staticOpts });

export const connectChannelsQuery = () =>
  queryOptions({ queryKey: ['channels', 'connect'], queryFn: () => transport.get<ConnectChannel[]>('/inbox/connect-channels'), ...staticOpts });

export const contactQuery = (id: string) =>
  queryOptions({ queryKey: ['crm', 'contact', id], queryFn: () => transport.get<Contact360>(`/contacts/${id}`) });

export const groupQuery = (id: string) => queryOptions({ queryKey: ['inbox', 'group', id], queryFn: () => transport.get<GroupInfo | null>(`/groups/${id}`) });

export interface CannedGroup {
  group: string;
  items: [cmd: string, title: string, body: string][];
}

/** Thẻ dùng chung (gắn thẻ hàng loạt — TIP-025b). */
export const tagsQuery = () => queryOptions({ queryKey: ['tags', 'inbox'], queryFn: () => transport.get<{ id: string; name: string; color: string; emoji: string | null }[]>('/tags'), ...staticOpts });
export const cannedQuery = () => queryOptions({ queryKey: ['inbox', 'canned'], queryFn: () => transport.get<CannedGroup[]>('/canned-replies'), ...staticOpts });

/** Thành viên workspace để @nhắc trong ghi chú (cùng nguồn `/members` với ô chọn người phụ trách — không import feature customers). */
export const mentionMembersQuery = () =>
  queryOptions({ queryKey: ['members'], queryFn: () => transport.get<{ id: string; name: string }[]>('/members'), ...staticOpts });

/** Quyền hiệu lực của agent phụ trách hội thoại (menu ＋ — REQ-C11, D51; chỉ đọc). */
export const agentToolsQuery = (conversationId: string) =>
  queryOptions({ queryKey: ['inbox', 'agent-tools', conversationId], queryFn: () => transport.get<AgentToolsDto>(`/conversations/${conversationId}/agent-tools`) });
