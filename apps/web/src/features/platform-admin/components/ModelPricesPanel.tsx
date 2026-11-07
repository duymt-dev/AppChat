// /admin › Đơn giá model (TIP-040, DC-370): credit / 1k token vào / ra (thập phân ≤ 4 lẻ). Bước AI mới dùng giá mới (≤ 2 giây mọi tiến
// trình); credit đã trừ giữ giá cũ. Giá đang được route dùng không tắt được (server 422).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Form, Input, Modal, Select, Switch, Table, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminPricesQuery, adminProvidersQuery } from '../api';
import { useAdminStyles } from '../styles/admin.styles';
import type { AdminPrice } from '../types';

const CREDITS = /^\d{1,8}(\.\d{1,4})?$/;
const TIERS = ['standard', 'advanced', 'max'] as const;

export function ModelPricesPanel() {
  const t = useTranslations('platformAdmin.prices');
  const { styles } = useAdminStyles();
  const q = useQuery(adminPricesQuery());
  const pq = useQuery(adminProvidersQuery());
  const save = useAction('admin.model_price.upsert');
  const [edit, setEdit] = useState<{ p: AdminPrice | null } | null>(null);
  const [form] = Form.useForm();
  const submit = async () => {
    const v = await form.validateFields();
    const p = edit?.p;
    const body = { provider_key: v.provider_key, model: v.model.trim(), ...(p ? { if_version: p.version } : {}), tier: v.tier, credits_per_1k_in: v.in, credits_per_1k_out: v.out, active: !!v.active };
    if (await save.run(body)) setEdit(null);
  };
  return (
    <div className={styles.card}>
      <div className={styles.bar}>
        <span className={styles.grow} />
        <Button type="primary" onClick={() => setEdit({ p: null })} data-testid="adm-price-new">
          {t('create')}
        </Button>
      </div>
      <PageStates state={stateOf(q, (d: AdminPrice[]) => !d.length)} onRetry={() => void q.refetch()}>
        <Table<AdminPrice>
          rowKey={(p) => `${p.provider_key}:${p.model}`}
          size="middle"
          pagination={false}
          dataSource={q.data ?? []}
          data-testid="adm-price-table"
          onRow={(p) => ({ onClick: () => setEdit({ p }) })}
          columns={[
            { title: t('provider'), dataIndex: 'provider_key' },
            { title: t('model'), dataIndex: 'model' },
            { title: t('tier'), render: (_, p) => t(`tiers.${p.tier}`) },
            { title: t('in'), dataIndex: 'credits_per_1k_in' },
            { title: t('out'), dataIndex: 'credits_per_1k_out' },
            { title: t('active'), render: (_, p) => <Tag color={p.active ? 'green' : 'default'}>{t(p.active ? 'on' : 'off')}</Tag> },
          ]}
        />
      </PageStates>
      {edit && (
        <Modal open title={edit.p ? `${edit.p.provider_key} · ${edit.p.model}` : t('create')} onCancel={() => setEdit(null)} onOk={() => void submit()} okButtonProps={{ loading: save.isPending, 'data-testid': 'adm-price-save' } as never} destroyOnHidden>
          <Form
            form={form}
            layout="vertical"
            initialValues={edit.p ? { provider_key: edit.p.provider_key, model: edit.p.model, tier: edit.p.tier, in: edit.p.credits_per_1k_in, out: edit.p.credits_per_1k_out, active: edit.p.active } : { tier: 'standard', active: true }}
          >
            <Form.Item name="provider_key" label={t('provider')} rules={[{ required: true }]}>
              <Select disabled={!!edit.p} options={(pq.data ?? []).map((p) => ({ value: p.key, label: p.name }))} />
            </Form.Item>
            <Form.Item name="model" label={t('model')} rules={[{ required: true, max: 120 }]}>
              <Input disabled={!!edit.p} />
            </Form.Item>
            <Form.Item name="tier" label={t('tier')}>
              <Select options={TIERS.map((x) => ({ value: x, label: t(`tiers.${x}`) }))} />
            </Form.Item>
            <Form.Item name="in" label={t('in')} rules={[{ required: true, pattern: CREDITS, message: t('invalid') }]}>
              <Input inputMode="decimal" data-testid="adm-price-in" />
            </Form.Item>
            <Form.Item name="out" label={t('out')} rules={[{ required: true, pattern: CREDITS, message: t('invalid') }]}>
              <Input inputMode="decimal" />
            </Form.Item>
            <Form.Item name="active" label={t('active')} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}
