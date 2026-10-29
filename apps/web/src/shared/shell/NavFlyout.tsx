// Flyout của rail: Trợ lý AI (L812) và Khách hàng & CRM (L824). Mở khi hover, vị trí theo item.
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color, layout } from '@appchat/ui';
import { useCan } from '../authz/useCan';
import { CRM_ITEMS, type NavItem } from './nav-config';
import { useShellStore } from './shell-store';
import { usePopoverStyles } from './popover.styles';

function CrmRow({ item, onGo }: { item: NavItem; onGo: (route: string) => void }) {
  const t = useTranslations('shell.crmFly');
  const { styles } = usePopoverStyles();
  const allowed = useCan(item.permission ?? 'crm.view');
  if (!allowed) return null;
  return (
    <div className={styles.flyRow} onClick={() => onGo(item.route)}>
      <Icon name={item.icon} size={layout.iconSm} color={color.text3} />
      <span>{t(item.key)}</span>
    </div>
  );
}

export interface NavFlyoutProps {
  kind: 'assistant' | 'crm';
}

export function NavFlyout({ kind }: NavFlyoutProps) {
  const router = useRouter();
  const t = useTranslations('shell');
  const { styles } = usePopoverStyles();
  const flyout = useShellStore((s) => s.flyout);
  const setFlyout = useShellStore((s) => s.setFlyout);
  const canApprove = useCan('approvals.decide');
  if (!flyout || flyout.kind !== kind) return null;

  const go = (route: string) => {
    setFlyout(null);
    router.push(route);
  };

  return (
    <div
      className={styles.flyout}
      data-testid={`flyout-${flyout.kind}`}
      style={{ top: flyout.top, left: flyout.left, width: flyout.kind === 'crm' ? layout.flyout : 210 }}
    >
      {flyout.kind === 'assistant' ? (
        <>
          <div className={styles.eyebrow}>{t('assistantFly.title')}</div>
          <div className={styles.flyRow} onClick={() => go('/assistant')}>
            <Icon name="ic-inbox" size={layout.iconSm} color={color.text3} />
            <span>{t('assistantFly.chats')}</span>
          </div>
          <div className={styles.flyRow} onClick={() => go('/assistant/actions')}>
            <Icon name="ic-flow" size={layout.iconSm} color={color.text3} />
            <span>{t('assistantFly.actions')}</span>
          </div>
          {canApprove ? (
            <div className={styles.flyRow} onClick={() => go('/assistant/approvals')}>
              <Icon name="ic-shield" size={layout.iconSm} color={color.text3} />
              <span>{t('assistantFly.approvals')}</span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className={styles.eyebrow}>{t('crmFly.title')}</div>
          {CRM_ITEMS.map((item) => (
            <CrmRow key={item.route} item={item} onGo={go} />
          ))}
        </>
      )}
    </div>
  );
}
