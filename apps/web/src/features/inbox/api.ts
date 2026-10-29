// Đọc hộp thư (Blueprint §4.4 inbox). Ghi chỉ qua useAction (packages/actions/src/inbox.ts).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { ChannelAccount, ChannelMeta, ChannelType, ConnectChannel, Contact360, Conversation, FolderCounts, GroupInfo, ThreadData } from './types';

export const inboxKeys = {
  all: ['inbox'] as const,
  list: (channel: string | null) => ['inbox', 'conversations', { channel }] as const,
  counts: () => ['inbox', 'counts'] as const,
  conv: (id: string) => ['inbox', 'conversation', id] as const,
  thread: (id: string) => ['inbox', 'messages', id] as const,
};

const staticOpts = { staleTime: Infinity } as const;

export const conversationsQuery = (channel: ChannelType | null) =>
  queryOptions({
    queryKey: inboxKeys.list(channel),
    queryFn: () => transport.get<{ data: Conversation[]; next_cursor: string | null }>('/conversations', channel ? { channel } : undefined),
  });

export const countsQuery = () => queryOptions({ queryKey: inboxKeys.counts(), queryFn: () => transport.get<FolderCounts>('/conversations/counts') });

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
export interface Slot {
  day: string;
  mon: string;
  time: string;
  staff: string;
  best: boolean;
}

export const cannedQuery = () => queryOptions({ queryKey: ['inbox', 'canned'], queryFn: () => transport.get<CannedGroup[]>('/canned-replies'), ...staticOpts });
export const slotsQuery = () => queryOptions({ queryKey: ['booking', 'slots'], queryFn: () => transport.get<Slot[]>('/booking/slots'), ...staticOpts });
