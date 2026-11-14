// Drawer Hồ sơ 360° của khách — prototype L2723–2936 (cùng nội dung panel 360° hộp thư: dùng lại Profile360 qua features/inbox).
// Tab theo bố cục Hồ sơ 360° của vai trò người xem (REQ-F12, TIP-026) — cùng nguồn với Hộp thư.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer } from '@appchat/ui';
import { Profile360Actions, Profile360Content, tabLabel, useProfileTabs, type Tab360 } from '@/features/inbox';
import { useCrmUi } from '../crm-store';

export function Customer360Drawer() {
  const t = useTranslations('customers.p360');
  const tt = useTranslations('inbox.p360');
  const ui = useCrmUi();
  const [tab, setTab] = useState<Tab360>('overview');
  const tabs = useProfileTabs(ui.detail ?? '');
  const active = tabs.some((x) => x.key === tab) ? tab : (tabs[0]?.key ?? 'overview');
  const close = () => {
    ui.set({ detail: null, highlight: null });
    setTab('overview');
  };

  return (
    <EntityDrawer
      open={!!ui.detail}
      onClose={close}
      title={t('title')}
      badge={t('badge')}
      closeLabel={t('close')}
      tabs={tabs.map((x) => ({ key: x.key, label: tabLabel(x, tt) }))}
      tab={active}
      onTab={(k) => setTab(k as Tab360)}
      footer={ui.detail ? <Profile360Actions contactId={ui.detail} /> : null}
      muted
      testId="crm-360"
    >
      {ui.detail ? <Profile360Content contactId={ui.detail} tab={active} /> : null}
    </EntityDrawer>
  );
}
