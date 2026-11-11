// Form mẫu AI Agent (TIP-040, DC-370): tool mặc định chỉ chọn trong action agent được cấp (D51 — server kiểm lại); ẩn mẫu = khỏi catalog
// "Từ mẫu", agent đã tạo không đổi. Lưu = admin.agent_template.upsert (CAS).
'use client';
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useTranslations } from 'next-intl';
import { registry, isAgentGrantable } from '@appchat/actions';
import { useAction } from '@/shared/actions/useAction';
import type { AdminTemplate } from '../types';

const ROLES = ['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops'] as const;
const TIERS = ['standard', 'advanced', 'max'] as const;
const GRANTABLE = registry.filter(isAgentGrantable).map((a) => a.id);
const HEX = /^#[0-9A-Fa-f]{6}$/;

export function TemplateForm({ tpl, onClose }: { tpl: AdminTemplate | null; onClose: () => void }) {
  const t = useTranslations('platformAdmin.templates');
  const save = useAction('admin.agent_template.upsert');
  const [form] = Form.useForm();
  const submit = async () => {
    const v = await form.validateFields();
    const body = {
      key: v.key,
      ...(tpl ? { if_version: tpl.version } : {}),
      role: v.role,
      industry_group: v.industry_group || null,
      industry: v.industry,
      name: v.name,
      description: v.description ?? '',
      color: v.color,
      tint: v.tint,
      icon: v.icon,
      defaults: { tools: v.tools ?? [], intents: tpl?.defaults.intents ?? [0], model_tier: v.model_tier, threshold: v.threshold, prompt: v.prompt },
      active: !!v.active,
      sort: v.sort ?? 0,
    };
    if (await save.run(body)) onClose();
  };
  const initial = tpl
    ? { ...tpl, tools: tpl.defaults.tools, model_tier: tpl.defaults.model_tier, threshold: tpl.defaults.threshold, prompt: tpl.defaults.prompt }
    : { role: 'sales', model_tier: 'advanced', threshold: 70, active: true, sort: 100, color: '#16A34A', tint: '#DCFCE7', icon: 'store', tools: [] };
  return (
    <Modal open title={tpl ? t('edit', { name: tpl.name }) : t('create')} onCancel={onClose} onOk={() => void submit()} okButtonProps={{ loading: save.isPending, 'data-testid': 'adm-tpl-save' } as never} destroyOnHidden width={640}>
      <Form form={form} layout="vertical" initialValues={initial}>
        <Form.Item name="key" label={t('key')} rules={[{ required: true, pattern: /^[a-z0-9][a-z0-9_-]{1,39}$/ }]}>
          <Input disabled={!!tpl} data-testid="adm-tpl-key" />
        </Form.Item>
        <Form.Item name="name" label={t('name')} rules={[{ required: true, max: 80 }]}>
          <Input data-testid="adm-tpl-name" />
        </Form.Item>
        <Form.Item name="role" label={t('role')}>
          <Select options={ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))} />
        </Form.Item>
        <Form.Item name="industry_group" label={t('group')} rules={[{ max: 60 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="industry" label={t('industry')} rules={[{ required: true, max: 60 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t('description')} rules={[{ max: 300 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="color" label={t('color')} rules={[{ required: true, pattern: HEX }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tint" label={t('tint')} rules={[{ required: true, pattern: HEX }]}>
          <Input />
        </Form.Item>
        <Form.Item name="icon" label={t('icon')} rules={[{ required: true, pattern: /^[a-z0-9-]{1,40}$/ }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tools" label={t('tools')} extra={t('toolsHint')}>
          <Select mode="multiple" options={GRANTABLE.map((id) => ({ value: id, label: id }))} maxCount={60} data-testid="adm-tpl-tools" />
        </Form.Item>
        <Form.Item name="model_tier" label={t('tier')}>
          <Select options={TIERS.map((x) => ({ value: x, label: t(`tiers.${x}`) }))} />
        </Form.Item>
        <Form.Item name="threshold" label={t('threshold')}>
          <InputNumber min={0} max={100} precision={0} />
        </Form.Item>
        <Form.Item name="prompt" label={t('prompt')} rules={[{ required: true, max: 8000 }]}>
          <Input.TextArea rows={5} />
        </Form.Item>
        <Form.Item name="sort" label={t('sort')}>
          <InputNumber min={0} max={1000} precision={0} />
        </Form.Item>
        <Form.Item name="active" label={t('active')} valuePropName="checked" extra={t('activeHint')}>
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
