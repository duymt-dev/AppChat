// Lệnh nhóm từ Hộp thư (TIP-025b §A): chính sách AI (ghi ngay, CAS theo policy_version — 409 thì làm mới trạng thái), các lệnh kênh trả
// `queued` → theo dõi một lệnh tới khi kết thúc (chưa xong ≠ thành công). Xong lệnh → làm mới trạng thái nhóm.
'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAction } from '@/shared/actions/useAction';
import { groupCommandQuery, groupKeys } from '../group-api';

type Queued = { command_id: string; status: 'queued' };

export function useGroupActions(convId: string) {
  const qc = useQueryClient();
  const policy = useAction<{ policy: string; policy_version: number }>('group.set_ai_policy');
  const refresh = useAction<Queued>('group.refresh');
  const update = useAction<Queued>('group.update');
  const mute = useAction<Queued>('group.set_mute');
  const add = useAction<Queued>('group.add_members');
  const [commandId, setCommandId] = useState<string | null>(null);
  const command = useQuery(groupCommandQuery(commandId)).data ?? null;
  const finished = !!command && command.state !== 'pending';
  useEffect(() => {
    if (finished) void qc.invalidateQueries({ queryKey: groupKeys.state(convId) });
  }, [finished, convId, qc]);

  const track = async (p: Promise<{ result: Queued } | null>) => {
    const r = await p;
    if (r) setCommandId(r.result.command_id);
    return !!r;
  };
  const invalidate = () => qc.invalidateQueries({ queryKey: groupKeys.state(convId) });

  return {
    command,
    clearCommand: () => setCommandId(null),
    pending: policy.isPending || refresh.isPending || update.isPending || mute.isPending || add.isPending,
    setPolicy: async (p: 'mention' | 'auto' | 'off', version: number) => {
      const r = await policy.run({ conversation_id: convId, policy: p, if_version: version });
      await invalidate();
      return !!r;
    },
    refresh: () => track(refresh.run({ conversation_id: convId })),
    update: (patch: { name?: string; invite_link_enabled?: boolean }, version: string) => track(update.run({ conversation_id: convId, ...patch, expected_version: version })),
    setMute: (muted: boolean) => track(mute.run({ conversation_id: convId, muted })),
    addMembers: (ids: string[]) => track(add.run({ conversation_id: convId, member_conversation_ids: ids })),
  };
}
