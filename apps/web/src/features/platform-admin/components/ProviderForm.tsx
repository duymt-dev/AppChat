// Form provider LLM (TIP-040, DC-371): key / header CHỈ GHI — ô trống = giữ nguyên (không bao giờ hiện giá trị cũ); "Xoá key" gửi null
// (provider tắt). Header nhập dạng `tên: giá trị` mỗi dòng (tên theo allowlist server). URL nội bộ bị server chặn trừ allowlist triển khai.
'use client';
import { useState } from 'react';
import { Checkbox, Form, Input, Modal, Select } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import type { AdminProvider } from '../types';

const KINDS = ['openai_compatible', 'openai', 'anthropic', 'google', 'deepseek'] as const;

/** "x-a: 1\nx-b: 2" → { 'x-a': '1', 'x-b': '2' }; rỗng → undefined (giữ nguyên). */
const parseHeaders = (raw: string | undefined) => {
  const lines = (raw ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return undefined;
  return Object.fromEntries(lines.map((l) => [l.slice(0, l.indexOf(':')).trim().toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]));
};

export function ProviderForm({ provider, onClose }: { provider: AdminProvider | null; onClose: () => void }) {
  const t = useTranslations('platformAdmin.providers');
  const save = useAction('admin.llm_provider.upsert');
  const [form] = Form.useForm();
  const [clearKey, setClearKey] = useState(false);
  const [clearHeaders, setClearHeaders] = useState(false);
  const submit = async () => {
    const v = await form.validateFields();
    const headers = clearHeaders ? null : parseHeaders(v.headers);
    const body = {
      key: v.key,
      ...(provider ? { if_version: provider.version } : {}),
      kind: v.kind,
      name: v.name,
      base_url: v.base_url ? v.base_url : null,
      ...(clearKey ? { api_key: null } : v.api_key ? { api_key: v.api_key } : {}),
      ...(headers === undefined ? {} : { headers }),
    };
    if (await save.run(body)) onClose();
  };
  const initial = provider ? { key: provider.key, kind: provider.kind, name: provider.name, base_url: provider.base_url ?? '' } : { kind: 'openai_compatible' };
  return (
    <Modal
      open
      title={provider ? t('edit', { name: provider.name }) : t('create')}
      onCancel={onClose}
      onOk={() => void submit()}
      okButtonProps={{ loading: save.isPending, 'data-testid': 'adm-prov-save' } as never}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" autoComplete="off" initialValues={initial}>
        <Form.Item name="key" label={t('key')} rules={[{ required: true, pattern: /^[a-z0-9][a-z0-9_-]{1,39}$/ }]}>
          <Input disabled={!!provider} data-testid="adm-prov-key" />
        </Form.Item>
        <Form.Item name="kind" label={t('kind')}>
          <Select options={KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))} />
        </Form.Item>
        <Form.Item name="name" label={t('name')} rules={[{ required: true, max: 60 }]}>
          <Input data-testid="adm-prov-name" />
        </Form.Item>
        <Form.Item name="base_url" label={t('baseUrl')} rules={[{ type: 'url' }]} extra={t('baseUrlHint')}>
          <Input data-testid="adm-prov-url" />
        </Form.Item>
        <Form.Item name="api_key" label={t('apiKey')} extra={provider?.has_api_key ? t('keySet') : t('keyMissing')}>
          <Input.Password autoComplete="new-password" disabled={clearKey} visibilityToggle={false} data-testid="adm-prov-apikey" />
        </Form.Item>
        {provider?.has_api_key && (
          <Checkbox checked={clearKey} onChange={(e) => setClearKey(e.target.checked)}>
            {t('clearKey')}
          </Checkbox>
        )}
        <Form.Item name="headers" label={t('headers')} extra={provider?.header_names.length ? t('headersSet', { names: provider.header_names.join(', ') }) : t('headersHint')}>
          <Input.TextArea rows={3} disabled={clearHeaders} autoComplete="off" />
        </Form.Item>
        {!!provider?.header_names.length && (
          <Checkbox checked={clearHeaders} onChange={(e) => setClearHeaders(e.target.checked)}>
            {t('clearHeaders')}
          </Checkbox>
        )}
      </Form>
    </Modal>
  );
}
