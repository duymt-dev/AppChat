// /admin › Mẫu AI Agent (TIP-040, DC-370): catalog mẫu cho Builder "Từ mẫu" — sửa / ẩn mẫu, không đổi agent đã tạo.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Table, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminTemplatesQuery } from '../api';
import { useAdminStyles } from '../styles/admin.styles';
import { TemplateForm } from './TemplateForm';
import type { AdminTemplate } from '../types';

export function TemplatesPanel() {
  const t = useTranslations('platformAdmin.templates');
  const { styles } = useAdminStyles();
  const q = useQuery(adminTemplatesQuery());
  const [edit, setEdit] = useState<{ tpl: AdminTemplate | null } | null>(null);
  return (
    <div className={styles.card}>
      <div className={styles.bar}>
        <span className={styles.grow} />
        <Button type="primary" onClick={() => setEdit({ tpl: null })} data-testid="adm-tpl-new">
          {t('create')}
        </Button>
      </div>
      <PageStates state={stateOf(q, (d: AdminTemplate[]) => !d.length)} onRetry={() => void q.refetch()}>
        <Table<AdminTemplate>
          rowKey="key"
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          dataSource={q.data ?? []}
          scroll={{ x: 800 }}
          data-testid="adm-tpl-table"
          onRow={(tpl) => ({ onClick: () => setEdit({ tpl }) })}
          columns={[
            { title: t('name'), render: (_, x) => <><div>{x.name}</div><div className={styles.muted}>{x.key}</div></> },
            { title: t('role'), render: (_, x) => t(`roles.${x.role}`) },
            { title: t('industry'), dataIndex: 'industry' },
            { title: t('tools'), render: (_, x) => x.defaults.tools.length },
            { title: t('active'), render: (_, x) => <Tag color={x.active ? 'green' : 'default'}>{t(x.active ? 'on' : 'off')}</Tag> },
          ]}
        />
      </PageStates>
      {edit && <TemplateForm tpl={edit.tpl} onClose={() => setEdit(null)} />}
    </div>
  );
}
