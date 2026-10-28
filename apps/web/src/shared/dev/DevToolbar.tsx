// Dev toolbar (chỉ mock): đổi 5 vai trò để kiểm useCan / chip "Của tôi" theo Blueprint §3.5.
// Ẩn khi đo parity (?parity=1) để không lệch ảnh.
'use client';
import { useState, useSyncExternalStore } from 'react';
import { Select } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslations } from 'next-intl';
import { SYSTEM_ROLES, type SystemRole } from '@appchat/shared';
import { color, font, radius, shadow } from '@appchat/ui';
import { apiMode } from '../api/transport';
import { mockDb, setMockRole } from '../api/mock/store';

const useStyles = createStyles(({ css }) => ({
  bar: css`
    position: fixed;
    right: 12px;
    bottom: 72px;
    z-index: 3000;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: ${color.surface};
    border: 1px dashed ${color.border};
    border-radius: ${radius.md}px;
    box-shadow: ${shadow.card};
    font-size: ${font.size.small}px;
    color: ${color.text3};
  `,
}));

const noopSubscribe = () => () => {};

export function DevToolbar() {
  const t = useTranslations('dev');
  const { styles } = useStyles();
  const hidden = useSyncExternalStore(
    noopSubscribe,
    () => apiMode() !== 'mock' || new URLSearchParams(window.location.search).has('parity'),
    () => true,
  );
  const [role, setRole] = useState<SystemRole>(() => mockDb().role);

  if (hidden) return null;
  return (
    <div className={styles.bar} data-testid="dev-toolbar">
      {t('role')}
      <Select<SystemRole>
        size="small"
        value={role}
        style={{ width: 140 }}
        onChange={(r) => {
          setRole(r);
          setMockRole(r);
        }}
        options={SYSTEM_ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
        data-testid="dev-role"
      />
    </div>
  );
}
