// Đồng bộ danh bạ tài khoản kênh (TIP-014b D3): bấm "Lấy danh bạ" → `channel.sync_contacts` (202, việc nền) → đọc
// `/settings/channels/:id/contact-syncs/:syncId` (hỏi lại 2 giây khi còn chạy). Nhập khách chỉ khi người dùng chọn dòng và bấm — qua
// `contact.import` (crm.import, Executor, xem trước như nhập file). Không tự nhập, không gửi gì cho khách.
'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { IMPORT_BATCH, syncRunning, type ContactSync, type ContactSyncRow } from '../channel-sync-types';

const syncKey = (accountId: string, syncId: string) => ['channels', 'contact-sync', accountId, syncId] as const;

export function useContactSync(accountId: string) {
  const qc = useQueryClient();
  const canImport = useCan('crm.import');
  const [syncId, setSyncId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const start = useAction('channel.sync_contacts');
  const importer = useAction('contact.import');

  const q = useQuery({
    queryKey: syncKey(accountId, syncId ?? ''),
    queryFn: () => transport.get<ContactSync>(`/settings/channels/${accountId}/contact-syncs/${syncId}`),
    enabled: !!syncId,
    refetchInterval: (query) => (syncRunning(query.state.data?.state) ? 2000 : false),
  });

  const run = () => {
    setPicked(new Set());
    void start.run({ channel_account_id: accountId }, { silent: true, onAccepted: (a) => 'job_id' in a && setSyncId(a.job_id) });
  };

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < IMPORT_BATCH) n.add(id);
      return n;
    });

  /** Nhập các dòng đã chọn (chỉ dòng có SĐT, chưa có khách) — tên + SĐT đúng như danh bạ, nguồn Zalo cá nhân. */
  const importPicked = async () => {
    const rows = (q.data?.rows ?? []).filter((r) => picked.has(r.external_id) && r.state === 'importable' && r.phone);
    if (!rows.length) return;
    const r = await importer.run({ rows: rows.map((x) => ({ full_name: x.name, phone: x.phone!, source: 'zalo_personal' as const })) });
    if (r) {
      setPicked(new Set());
      await qc.invalidateQueries({ queryKey: syncKey(accountId, syncId ?? '') });
    }
  };

  const importable = (r: ContactSyncRow) => canImport && r.state === 'importable';
  return { sync: q.data, loading: start.isPending || syncRunning(q.data?.state), run, picked, toggle, importable, importPicked, importing: importer.isPending, canImport };
}
