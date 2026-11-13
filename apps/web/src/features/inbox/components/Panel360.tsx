// Hồ sơ 360° của khách — prototype L2011–2224: header · 5 tab · nội dung · hàng nghiệp vụ (báo giá / hợp đồng / đơn) · thanh hành động.
// Nút ⚙ (REQ-F12) mở hộp Tuỳ chỉnh bố cục cho đúng mẫu đang gán với vai trò của người dùng hiện tại.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAuthz } from '@/shared/authz/useCan';
import { ProfileLayoutEditor } from '@/features/settings';
import { profileLayoutsQuery } from '@/features/settings/api';
import { useProfileLayoutUi } from '@/features/settings/profile-layout-store';
import { usePanelStyles } from '../styles/panel.styles';
import { useInboxUi } from '../inbox-store';
import { Profile360Actions } from './Profile360Actions';
import { Profile360Content } from './Profile360Content';
import { useProfileTabs } from '../hooks/useProfileTabs';
import { tabLabel } from './tab-label';

export function Panel360({ contactId, conversationId }: { contactId: string; conversationId?: string }) {
  const t = useTranslations('inbox.p360');
  const { styles, cx } = usePanelStyles();
  const ui = useInboxUi();
  const authz = useAuthz().data;
  const layouts = useQuery(profileLayoutsQuery()).data;
  const openEditor = useProfileLayoutUi((s) => s.open);
  const tabs = useProfileTabs(contactId);
  const active = tabs.some((x) => x.key === ui.tab360) ? ui.tab360 : (tabs[0]?.key ?? 'overview');
  const onCustomize = () => {
    const id = authz && layouts ? layouts.role_assignments[authz.role] : undefined;
    if (id) openEditor(id);
  };

  return (
    <aside className={styles.panel} data-testid="panel-360">
      <div className={styles.head}>
        <span className={styles.headIcon}>
          <Icon name="ic-spark" size={14} color={color.white} />
        </span>
        {t('title')}
        <span className={styles.badge}>{t('aiBadge')}</span>
        <button type="button" className={styles.gear} onClick={onCustomize} aria-label={t('customize')} data-testid="p360-customize">
          <Icon name="ic-cog" size={15} color={color.text3} />
        </button>
        <button type="button" className={styles.close} onClick={ui.toggle360} aria-label={t('close')}>
          <Icon name="ic-x" size={18} color={color.text3} />
        </button>
      </div>
      <ProfileLayoutEditor />
      <div className={styles.tabs} role="tablist">
        {tabs.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={active === x.key} className={cx(styles.tab, active === x.key && styles.tabOn)} onClick={() => ui.set({ tab360: x.key })}>
            {tabLabel(x, t)}
          </button>
        ))}
      </div>
      <div className={styles.scroll}>
        <Profile360Content contactId={contactId} tab={active} />
      </div>
      <Profile360Actions contactId={contactId} conversationId={conversationId} />
    </aside>
  );
}
