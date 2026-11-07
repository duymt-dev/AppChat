// /admin › Workspaces (TIP-040 pha 4–5, DC-373): lọc trạng thái / gói / tìm, cursor; tạm dừng (lý do bắt buộc) / mở lại qua action
// admin.workspace.* (CAS `version`, server trả 409 khi đã đổi → tải lại). Số liệu chưa làm tươi → "—" (không giả 0). Không có nút
// lưu trữ / khôi phục (TIP-041).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Select, Table, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminWorkspacesQuery } from '../api';
import { useCursorPage } from '../hooks/useAdminQueries';
import { useAdminStyles } from '../styles/admin.styles';
import { CursorPager } from './CursorPager';
import type { AdminWorkspace } from '../types';

export function WorkspaceTable() {
  const t = useTranslations('platformAdmin.ws');
  const fmt = useFmt();
  const { styles } = useAdminStyles();
  const pg = useCursorPage<{ status?: string; q?: string }>({});
  const q = useQuery(adminWorkspacesQuery(pg.params));
  const suspend = useAction('admin.workspace.suspend');
  const resume = useAction('admin.workspace.resume');
  const [target, setTarget] = useState<AdminWorkspace | null>(null);
  const [reason, setReason] = useState('');
  const rows = q.data?.data ?? [];
  const doSuspend = async () => {
    if (!target || reason.trim().length < 3) return;
    if (await suspend.run({ workspace_id: target.id, if_version: target.version, reason: reason.trim() })) setTarget(null);
  };
  return (
    <div className={styles.card}>
      <div className={styles.bar}>
        <Input.Search allowClear placeholder={t('search')} aria-label={t('search')} onSearch={(v) => pg.setFilter({ q: v || undefined })} style={{ maxWidth: 280 }} data-testid="adm-ws-search" />
        <Select
          allowClear
          placeholder={t('status')}
          aria-label={t('status')}
          value={pg.filter.status}
          onChange={(v?: string) => pg.setFilter({ status: v })}
          options={['active', 'suspended'].map((s) => ({ value: s, label: t(`st.${s}`) }))}
          style={{ width: 160 }}
          data-testid="adm-ws-status"
        />
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        <Table<AdminWorkspace>
          rowKey="id"
          size="middle"
          dataSource={rows}
          pagination={false}
          scroll={{ x: 960 }}
          data-testid="adm-ws-table"
          locale={{ emptyText: t('empty') }}
          columns={[
            { title: t('col.name'), render: (_, w) => <><div>{w.name}</div><div className={styles.muted}>{w.slug}</div></> },
            { title: t('col.owner'), render: (_, w) => w.owner?.email ?? '—' },
            { title: t('col.plan'), render: (_, w) => w.subscription?.plan_name ?? '—' },
            { title: t('col.status'), render: (_, w) => <Tag color={w.status === 'active' ? 'green' : 'red'}>{t(`st.${w.status}`)}</Tag> },
            { title: t('col.stats'), render: (_, w) => (w.stats ? t('stats', { contacts: w.stats.contacts, conv: w.stats.conversations_30d }) : '—') },
            { title: t('col.created'), render: (_, w) => fmt.date(w.created_at) },
            {
              title: '',
              render: (_, w) =>
                w.status === 'active' ? (
                  <Button size="small" danger disabled={w.db_status !== 'active'} onClick={() => (setReason(''), setTarget(w))} data-testid={`adm-ws-suspend-${w.id}`}>
                    {t('suspend')}
                  </Button>
                ) : (
                  <Button size="small" disabled={w.db_status !== 'suspended'} loading={resume.isPending} onClick={() => void resume.run({ workspace_id: w.id, if_version: w.version })} data-testid={`adm-ws-resume-${w.id}`}>
                    {t('resume')}
                  </Button>
                ),
            },
          ]}
        />
        <CursorPager page={pg.page} hasNext={!!q.data?.next_cursor} onPrev={pg.prev} onNext={() => pg.next(q.data?.next_cursor)} testId="adm-ws-pager" />
      </PageStates>
      <Modal open={!!target} title={t('suspendTitle', { name: target?.name ?? '' })} onCancel={() => setTarget(null)} onOk={() => void doSuspend()} okText={t('suspend')} okButtonProps={{ danger: true, disabled: reason.trim().length < 3, loading: suspend.isPending, 'data-testid': 'adm-ws-suspend-ok' } as never} destroyOnHidden>
        <p className={styles.muted}>{t('suspendHint')}</p>
        <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder={t('reason')} aria-label={t('reason')} data-testid="adm-ws-reason" />
      </Modal>
    </div>
  );
}
