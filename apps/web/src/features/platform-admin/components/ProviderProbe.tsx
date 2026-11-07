// Hộp kiểm tra provider (TIP-040, DC-371): admin chọn khả năng + model — server gọi THẬT từng khả năng (tốn phí nhỏ, cách nhau ≥ 10 giây),
// kết quả riêng từng khả năng (chat được không suy ra embed được); lỗi chỉ là mã đã làm sạch.
'use client';
import { useState } from 'react';
import { Checkbox, Input, Modal, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useAdminStyles } from '../styles/admin.styles';
import type { AdminProvider } from '../types';

export const CAPS = ['chat', 'tools', 'json_schema', 'streaming', 'embeddings'] as const;
type Check = { capability: string; ok: boolean; error?: string };

export function ProviderProbe({ provider, onClose }: { provider: AdminProvider; onClose: () => void }) {
  const t = useTranslations('platformAdmin.providers');
  const { styles } = useAdminStyles();
  const probe = useAction<{ checks: Check[] }>('admin.llm_provider.probe');
  const [caps, setCaps] = useState<string[]>(['chat']);
  const [chat, setChat] = useState('');
  const [embed, setEmbed] = useState('');
  const [checks, setChecks] = useState<Check[] | null>(null);
  const run = async () => {
    const r = await probe.run({ key: provider.key, if_version: provider.version, chat_model: chat || null, embed_model: embed || null, capabilities: caps }, { silent: true });
    if (r) setChecks(r.result.checks);
  };
  return (
    <Modal
      open
      title={t('testTitle', { name: provider.name })}
      onCancel={onClose}
      onOk={() => void run()}
      okText={t('runTest')}
      okButtonProps={{ loading: probe.isPending, disabled: !caps.length, 'data-testid': 'adm-prov-run' } as never}
      destroyOnHidden
    >
      <p className={styles.muted}>{t('testHint')}</p>
      <div className={styles.group}>
        <Checkbox.Group value={caps} onChange={(v) => setCaps(v as string[])} options={CAPS.map((c) => ({ value: c, label: t(`cap.${c}`) }))} />
      </div>
      <div className={styles.group}>
        <Input placeholder={t('chatModel')} aria-label={t('chatModel')} value={chat} onChange={(e) => setChat(e.target.value)} data-testid="adm-prov-chat-model" />
      </div>
      <Input placeholder={t('embedModel')} aria-label={t('embedModel')} value={embed} onChange={(e) => setEmbed(e.target.value)} />
      {checks && (
        <ul data-testid="adm-prov-checks">
          {checks.map((c) => (
            <li key={c.capability}>
              <Tag color={c.ok ? 'green' : 'red'}>{t(`cap.${c.capability}`)}</Tag>
              {c.ok ? t('ok') : t(`err.${c.error ?? 'provider_error'}`)}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
