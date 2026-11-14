'use client';
import { Icon, layout, type IconName } from '@appchat/ui';
import { useTranslations } from 'next-intl';
import { useAction } from '../actions/useAction';
import { useNotifications } from './useShellData';
import { NOTIF_TONES, usePopoverStyles } from './popover.styles';

export function NotificationsPopover() {
  const t = useTranslations('shell.notifications');
  const { styles } = usePopoverStyles();
  const { data } = useNotifications();
  const markRead = useAction('notification.mark_read');
  return (
    <div className={styles.panel} style={{ width: layout.popoverNotif }} data-testid="notifications-popover">
      <div className={styles.head}>
        <span className={styles.headTitle}>{t('title')}</span>
        <button type="button" className={styles.link} onClick={() => markRead.run({ ids: 'all' }, { silent: true })}>
          {t('markRead')}
        </button>
      </div>
      <div className={styles.list}>
        {data?.data.map((n) => {
          const tone = NOTIF_TONES[n.tone];
          return (
            <div key={n.id} className={styles.notif}>
              <span className={styles.notifIcon} style={{ background: tone.bg, color: tone.fg }}>
                <Icon name={n.icon as IconName} size={layout.iconSm} />
              </span>
              <div>
                <div className={styles.notifTitle}>{n.title}</div>
                <div className={styles.notifAgo}>{n.ago}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
