// Bạn bè Zalo của một tài khoản kênh (TIP-014b E — DC nới DC-247): lời mời tới (`/friends?state=incoming`) → nhận / từ chối (inbox.reply);
// tra MỘT SĐT (`channel.lookup_user`, inbox.manage) → kết quả tạm 24 giờ (`/lookups/:id`, hỏi lại 2 giây khi đang tra) → gửi / thu hồi lời
// mời (inbox.manage, người bấm xác nhận cảnh báo rủi ro) hoặc "Lưu thành khách" (contact.create, crm.edit). Lệnh là việc nền: theo dõi
// `/friends/:externalId` tới khi confirmed / failed / unknown. Không hàng loạt, không AI.
'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChannelFriendDto, ChannelLookupDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';

export type FriendOp = 'accept' | 'reject' | 'send' | 'undo';
const base = (accountId: string) => ['channels', 'friends', accountId] as const;
const pending = (f?: ChannelFriendDto) => f?.op_status === 'queued';
const looking = (l?: ChannelLookupDto) => l?.state === 'queued' || l?.state === 'running';

export function useChannelFriends(accountId: string) {
  const qc = useQueryClient();
  const canReply = useCan('inbox.reply');
  const canManage = useCan('inbox.manage');
  const canSave = useCan('crm.edit');
  const [lookupId, setLookupId] = useState<string | null>(null);
  const [watch, setWatch] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const acts = {
    accept: useAction('channel.friend.accept'),
    reject: useAction('channel.friend.reject'),
    send: useAction('channel.friend.send'),
    undo: useAction('channel.friend.undo'),
  };
  const lookup = useAction('channel.lookup_user');
  const create = useAction<{ contact_id: string }>('contact.create');

  const incoming = useQuery({
    queryKey: [...base(accountId), 'incoming'],
    queryFn: () => transport.get<ChannelFriendDto[]>(`/settings/channels/${accountId}/friends`, { state: 'incoming' }),
    enabled: canReply,
  });
  const result = useQuery({
    queryKey: [...base(accountId), 'lookup', lookupId ?? ''],
    queryFn: () => transport.get<ChannelLookupDto>(`/settings/channels/${accountId}/lookups/${lookupId}`),
    enabled: !!lookupId,
    refetchInterval: (q) => (looking(q.state.data) ? 2000 : false),
  });
  const found = result.data?.state === 'found' ? result.data.external_id : null;
  const target = watch ?? found;
  const status = useQuery({
    queryKey: [...base(accountId), 'one', target ?? ''],
    queryFn: () => transport.get<ChannelFriendDto>(`/settings/channels/${accountId}/friends/${target}`),
    enabled: !!target,
    refetchInterval: (q) => (pending(q.state.data) ? 2000 : false),
  });

  const op = (kind: FriendOp, externalId: string, message?: string) => {
    setWatch(externalId);
    void acts[kind].run(
      { channel_account_id: accountId, external_id: externalId, ...(kind === 'send' ? { message: message ?? '' } : {}) },
      { silent: true, onAccepted: () => void qc.invalidateQueries({ queryKey: base(accountId) }) },
    );
  };

  const find = (phone: string) => {
    setSaved(false);
    setWatch(null);
    void lookup.run({ channel_account_id: accountId, phone }, { silent: true, onAccepted: (a) => 'job_id' in a && setLookupId(a.job_id) });
  };

  /** "Lưu thành khách" — chỉ khi người dùng bấm; tên + SĐT đúng như kết quả tra, nguồn Zalo cá nhân. */
  const save = async () => {
    const l = result.data;
    if (!l || l.state !== 'found') return;
    const r = await create.run({ full_name: l.name ?? l.phone, phone: l.phone, source: 'zalo_personal' });
    if (r) setSaved(true);
  };

  return {
    canReply,
    canManage,
    canSave,
    incoming: incoming.data ?? [],
    op,
    busy: Object.values(acts).some((a) => a.isPending),
    find,
    finding: lookup.isPending || looking(result.data),
    lookup: result.data,
    friend: status.data,
    save,
    saving: create.isPending,
    saved,
  };
}
