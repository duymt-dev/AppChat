// /admin › Yêu cầu đóng băng (TIP-041 P3, DC-245): Owner gửi yêu cầu, admin nền tảng duyệt (tạm dừng theo luật TIP-040, CAS phiên bản) hoặc
// từ chối (workspace không đổi) — luôn kèm lý do. Requester mất quyền / workspace đã xoá → server đánh `cancelled`. Lọc theo trạng thái.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Segmented, Table } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminFreezeRequestsQuery } from '../api';
import { useCursorPage } from '../hooks/useAdminQueries';
import { useAdminStyles } from '../styles/admin.styles';
import { CursorPager } from './CursorPager';
import type { FreezeRequest } from '../types';

const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
type Status = (typeof STATUSES)[number];
type Decision = { row: FreezeRequest; decision: 'approve' | 'reject' };

export function FreezeRequestsPanel() {
  const t = useTranslations('platformAdmin.freeze');
  const fmt = useFmt();
  const { styles } = useAdminStyles();
  const pg = useCursorPage<{ status?: string }>({ status: 'pending' });
  const q = useQuery(adminFreezeRequestsQuery(pg.params));
  const decide = useAction('admin.workspace.freeze_decide');
  const [open, setOpen] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const submit = async () => {
    if (!open) return;
    const r = await decide.run({ request_id: open.row.id, if_version: open.row.version, decision: open.decision, reason: reason.trim() });
    if (r) setOpen(null);
  };
  const start = (row: FreezeRequest, decision: Decision['decision']) => {
    setReason('');
    setOpen({ row, decision });
  };
  return (
    <div className={styles.card}>
      <div className={styles.bar}>
        <Segmented<Status>
          value={(pg.filter.status as Status) ?? 'pending'}
          onChange={(v) => pg.setFilter({ status: v })}
          options={STATUSES.map((v) => ({ value: v, label: t(`status.${v}`) }))}
          data-testid="adm-fr-status"
        />
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        <Table<FreezeRequest>
          rowKey="id"
          size="middle"
          pagination={false}
          dataSource={q.data?.data ?? []}
          scroll={{ x: 900 }}
          data-testid="adm-fr-table"
          locale={{ emptyText: t('empty') }}
          columns={[
            { title: t('workspace'), dataIndex: 'workspace_name' },
            { title: t('reason'), dataIndex: 'reason' },
            { title: t('created'), render: (_, r) => fmt.date(r.created_at) },
            { title: t('decision'), render: (_, r) => (r.decided_at ? <><div>{t(`status.${r.status}`)}</div><div className={styles.muted}>{r.decision_reason}</div></> : '—') },
            {
              title: '',
              render: (_, r) =>
                r.status === 'pending' ? (
                  <span className={styles.bar}>
                    <Button size="small" type="primary" onClick={() => start(r, 'approve')} data-testid={`adm-fr-approve-${r.id}`}>
                      {t('approve')}
                    </Button>
                    <Button size="small" onClick={() => start(r, 'reject')} data-testid={`adm-fr-reject-${r.id}`}>
                      {t('reject')}
                    </Button>
                  </span>
                ) : null,
            },
          ]}
        />
        <CursorPager page={pg.page} hasNext={!!q.data?.next_cursor} onPrev={pg.prev} onNext={() => pg.next(q.data?.next_cursor)} testId="adm-fr-pager" />
      </PageStates>
      <Modal
        open={!!open}
        title={t(open?.decision === 'reject' ? 'rejectTitle' : 'approveTitle', { name: open?.row.workspace_name ?? '' })}
        onCancel={() => setOpen(null)}
        onOk={() => void submit()}
        okButtonProps={{ disabled: reason.trim().length < 3, loading: decide.isPending, 'data-testid': 'adm-fr-ok' } as never}
        destroyOnHidden
      >
        <p className={styles.muted}>{t(open?.decision === 'reject' ? 'rejectHint' : 'approveHint')}</p>
        <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder={t('reasonPh')} aria-label={t('reasonPh')} data-testid="adm-fr-reason" />
      </Modal>
    </div>
  );
}
