// /admin › Nhà cung cấp LLM (TIP-040, DC-371): chỉ thấy có / không có key + tên header; bật / tắt có hiệu lực mọi tiến trình ≤ 2 giây.
// Kiểm tra (probe) ở ProviderProbe — gọi THẬT tới provider.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Space, Table, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminProvidersQuery } from '../api';
import { useAdminStyles } from '../styles/admin.styles';
import { ProviderForm } from './ProviderForm';
import { CAPS, ProviderProbe } from './ProviderProbe';
import type { AdminProvider } from '../types';

export function ProviderPanel() {
  const t = useTranslations('platformAdmin.providers');
  const fmt = useFmt();
  const { styles } = useAdminStyles();
  const q = useQuery(adminProvidersQuery());
  const toggle = useAction('admin.llm_provider.disable');
  const [edit, setEdit] = useState<{ p: AdminProvider | null } | null>(null);
  const [testing, setTesting] = useState<AdminProvider | null>(null);
  return (
    <div className={styles.card}>
      <div className={styles.bar}>
        <span className={styles.grow} />
        <Button type="primary" onClick={() => setEdit({ p: null })} data-testid="adm-prov-new">
          {t('create')}
        </Button>
      </div>
      <PageStates state={stateOf(q, (d: AdminProvider[]) => !d.length)} onRetry={() => void q.refetch()}>
        <Table<AdminProvider>
          rowKey="key"
          size="middle"
          pagination={false}
          dataSource={q.data ?? []}
          scroll={{ x: 960 }}
          data-testid="adm-prov-table"
          columns={[
            {
              title: t('name'),
              render: (_, p) => (
                <>
                  <div>{p.name}</div>
                  <div className={styles.muted}>{`${p.key} · ${t(`kinds.${p.kind}`)}`}</div>
                </>
              ),
            },
            { title: t('baseUrl'), render: (_, p) => p.base_url ?? '—' },
            { title: t('apiKey'), render: (_, p) => <Tag color={p.has_api_key ? 'green' : 'red'}>{t(p.has_api_key ? 'keySet' : 'keyMissing')}</Tag> },
            { title: t('caps'), render: (_, p) => CAPS.filter((c) => c !== 'chat' && p.capabilities[c]).map((c) => <Tag key={c}>{t(`cap.${c}`)}</Tag>) },
            {
              title: t('probe'),
              render: (_, p) =>
                p.last_probe_at ? (
                  <>
                    <div>{fmt.date(p.last_probe_at)}</div>
                    {p.last_error && <div className={styles.muted}>{p.last_error}</div>}
                  </>
                ) : (
                  '—'
                ),
            },
            { title: t('status'), render: (_, p) => <Tag color={p.status === 'active' ? 'green' : 'default'}>{t(`st.${p.status}`)}</Tag> },
            {
              title: '',
              render: (_, p) => (
                <Space size={4}>
                  <Button size="small" onClick={() => setEdit({ p })} data-testid={`adm-prov-edit-${p.key}`}>
                    {t('editBtn')}
                  </Button>
                  <Button size="small" disabled={!p.has_api_key} onClick={() => setTesting(p)} data-testid={`adm-prov-test-${p.key}`}>
                    {t('test')}
                  </Button>
                  <Button
                    size="small"
                    danger={p.status === 'active'}
                    disabled={p.status === 'disabled' && !p.has_api_key}
                    onClick={() => void toggle.run({ key: p.key, if_version: p.version, status: p.status === 'active' ? 'disabled' : 'active' })}
                    data-testid={`adm-prov-toggle-${p.key}`}
                  >
                    {t(p.status === 'active' ? 'disable' : 'enable')}
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </PageStates>
      {edit && <ProviderForm provider={edit.p} onClose={() => setEdit(null)} />}
      {testing && <ProviderProbe provider={testing} onClose={() => setTesting(null)} />}
    </div>
  );
}
