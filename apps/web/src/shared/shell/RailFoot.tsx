'use client';
import { Icon, color } from '@appchat/ui';
import { useTranslations } from 'next-intl';
import { useShellStore } from './shell-store';
import { useMe } from './useShellData';
import { useRailFootStyles } from './rail-foot.styles';
import { NotificationsPopover } from './NotificationsPopover';
import { UserMenu } from './UserMenu';

export interface RailFootProps {
  expanded: boolean;
  onUpgrade: () => void;
}

export function RailFoot({ expanded, onUpgrade }: RailFootProps) {
  const t = useTranslations('shell');
  const tc = useTranslations('common');
  const { styles } = useRailFootStyles();
  const { data: me } = useMe();
  const popover = useShellStore((s) => s.popover);
  const togglePopover = useShellStore((s) => s.togglePopover);
  const days = me?.billing.trial_days_left ?? 0;
  const firstName = me?.user.name.split(' ').at(-1) ?? '';

  return (
    <div className={styles.foot} style={{ alignItems: expanded ? 'stretch' : 'center' }}>
      {expanded ? (
        <>
          <div className={styles.news}>
            <div className={styles.newsTitle}>{t('news.title')}</div>
            <div className={styles.newsBody}>{t('news.body')}</div>
            <div className={styles.newsLink} onClick={() => togglePopover('notifications')}>
              {tc('seeMore')}
            </div>
            <div className={styles.newsDots}>
              <span />
              <span data-on="" />
            </div>
          </div>
          <div className={styles.trial} onClick={onUpgrade}>
            <i />
            {days > 0 ? t('trial.active', { days }) : t('trial.free')}
          </div>
          <button type="button" className={styles.upgradeBtn} onClick={onUpgrade}>
            <Icon name="ic-bolt" size={17} strokeWidth={2} color={color.white} />
            {t('upgrade')}
          </button>
        </>
      ) : (
        <div className={styles.collapsedBtns}>
          <button
            type="button"
            data-testid="rail-notifications"
            className={styles.footBtn}
            style={{ color: color.text4 }}
            onClick={() => togglePopover('notifications')}
          >
            <Icon name="ic-bell" size={20} strokeWidth={1.7} />
            <span>{t('notifications.label')}</span>
            <span data-dot="" className={styles.dot} />
          </button>
          <button type="button" className={styles.footBtn} style={{ color: color.brand }} onClick={onUpgrade}>
            <Icon name="ic-bolt" size={20} />
            <span>{t('upgrade')}</span>
          </button>
        </div>
      )}
      <div className={styles.sep} />
      <button
        type="button"
        data-testid="rail-user"
        className={styles.me}
        style={{ justifyContent: expanded ? 'stretch' : 'center' }}
        onClick={() => togglePopover('user')}
      >
        <span className={styles.avatar}>{me?.user.initial}</span>
        {expanded ? (
          <span className={styles.meText}>
            <span className={styles.meName}>{me?.user.name}</span>
            <span className={styles.meTitle}>{me?.user.title}</span>
          </span>
        ) : (
          <span className={styles.meShort}>{firstName} ▾</span>
        )}
      </button>
      {popover === 'notifications' ? <NotificationsPopover /> : null}
      {popover === 'user' ? <UserMenu /> : null}
    </div>
  );
}
