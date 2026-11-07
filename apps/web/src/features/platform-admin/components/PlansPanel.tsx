// /admin › Gói (TIP-040, DC-370): bảng gói + form sửa. Đổi giá / hạn mức chỉ áp cho lần mua / gia hạn sau — preview server cảnh báo số
// subscription đang dùng gói.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Table, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminPlansQuery } from '../api';
import { useAdminStyles } from '../styles/admin.styles';
import { PlanForm } from './PlanForm';
import type { AdminPlan } from '../types';

export function PlansPanel() {
  const t = useTranslations('platformAdmin.plans');
  const fmt = useFmt();
  const { styles } = useAdminStyles();
  const q = useQuery(adminPlansQuery());
  const [edit, setEdit] = useState<{ plan: AdminPlan | null } | null>(null);
  const lim = (v: number | null) => (v === null ? '∞' : fmt.number(v));
  return (
    <div className={styles.card}>
      <div className={styles.bar}>
        <span className={styles.grow} />
        <Button type="primary" onClick={() => setEdit({ plan: null })} data-testid="adm-plan-new">
          {t('create')}
        </Button>
      </div>
      <PageStates state={stateOf(q, (d: AdminPlan[]) => !d.length)} onRetry={() => void q.refetch()}>
        <Table<AdminPlan>
          rowKey="key"
          size="middle"
          pagination={false}
          dataSource={q.data ?? []}
          scroll={{ x: 900 }}
          data-testid="adm-plans-table"
          onRow={(p) => ({ onClick: () => setEdit({ plan: p }), 'data-testid': `adm-plan-${p.key}` }) as never}
          columns={[
            { title: t('name'), render: (_, p) => <><div>{p.name}</div><div className={styles.muted}>{p.key}</div></> },
            { title: t('priceMonth'), render: (_, p) => (p.price_month === null ? t('contact') : fmt.money(p.price_month)) },
            { title: t('f.credits_month'), render: (_, p) => (p.credits_month === null ? '—' : fmt.number(p.credits_month)) },
            { title: t('limits'), render: (_, p) => `${lim(p.max_users)} · ${lim(p.max_channels)} · ${lim(p.max_agents)}` },
            { title: t('active'), render: (_, p) => <Tag color={p.active ? 'green' : 'default'}>{t(p.active ? 'on' : 'off')}</Tag> },
          ]}
        />
      </PageStates>
      {edit && <PlanForm open plan={edit.plan} onClose={() => setEdit(null)} />}
    </div>
  );
}
