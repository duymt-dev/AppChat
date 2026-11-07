// Form gói (TIP-040, DC-370): giá VND chuỗi số, hạn mức trống = không giới hạn, tính năng mỗi dòng một mục. Lưu = admin.plan.upsert
// (CAS `if_version`; 409 → tải lại). Gói Miễn phí / dùng thử không tắt được (server 422).
'use client';
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import type { AdminPlan } from '../types';

const LIMITS = ['credits_month', 'max_users', 'max_channels', 'max_agents'] as const;
const toLimit = (v: number | null | undefined) => (v === undefined || v === null ? null : v);

export function PlanForm({ plan, open, onClose }: { plan: AdminPlan | null; open: boolean; onClose: () => void }) {
  const t = useTranslations('platformAdmin.plans');
  const save = useAction('admin.plan.upsert');
  const [form] = Form.useForm();
  const submit = async () => {
    const v = await form.validateFields();
    const body = {
      key: v.key,
      ...(plan ? { if_version: plan.version } : {}),
      segment: v.segment,
      name: v.name,
      price_month: v.price_month || null,
      price_year: v.price_year || null,
      credits_month: toLimit(v.credits_month),
      max_users: toLimit(v.max_users),
      max_channels: toLimit(v.max_channels),
      max_agents: toLimit(v.max_agents),
      desc: v.desc ?? '',
      popular: !!v.popular,
      features: String(v.features ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean),
      active: !!v.active,
      sort: v.sort ?? 0,
    };
    if (await save.run(body)) onClose();
  };
  return (
    <Modal open={open} title={plan ? t('edit', { name: plan.name }) : t('create')} onCancel={onClose} onOk={() => void submit()} okButtonProps={{ loading: save.isPending, 'data-testid': 'adm-plan-save' } as never} destroyOnHidden width={560}>
      <Form form={form} layout="vertical" initialValues={plan ? { ...plan, features: plan.features.join('\n') } : { segment: 'business', active: true, sort: 100, popular: false }}>
        <Form.Item name="key" label={t('key')} rules={[{ required: true, pattern: /^[a-z0-9][a-z0-9_-]{1,39}$/ }]}>
          <Input disabled={!!plan} data-testid="adm-plan-key" />
        </Form.Item>
        <Form.Item name="name" label={t('name')} rules={[{ required: true, max: 60 }]}>
          <Input data-testid="adm-plan-name" />
        </Form.Item>
        <Form.Item name="segment" label={t('segment')}>
          <Select options={['personal', 'business'].map((s) => ({ value: s, label: t(`seg.${s}`) }))} />
        </Form.Item>
        <Form.Item name="price_month" label={t('priceMonth')} rules={[{ pattern: /^\d{0,13}$/ }]}>
          <Input inputMode="numeric" data-testid="adm-plan-price" />
        </Form.Item>
        <Form.Item name="price_year" label={t('priceYear')} rules={[{ pattern: /^\d{0,13}$/ }]}>
          <Input inputMode="numeric" />
        </Form.Item>
        {LIMITS.map((k) => (
          <Form.Item key={k} name={k} label={t(`f.${k}`)} extra={k === 'credits_month' ? undefined : t('unlimited')}>
            <InputNumber min={k === 'credits_month' ? 0 : 1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        ))}
        <Form.Item name="desc" label={t('desc')} rules={[{ max: 200 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="features" label={t('features')}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="sort" label={t('sort')}>
          <InputNumber min={0} max={1000} precision={0} />
        </Form.Item>
        <Form.Item name="popular" label={t('popular')} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="active" label={t('active')} valuePropName="checked" extra={t('activeHint')}>
          <Switch data-testid="adm-plan-active" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
