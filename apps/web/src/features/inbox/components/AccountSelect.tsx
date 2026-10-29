// Chọn tài khoản kênh — prototype L1651–1662 (danh sách tài khoản theo channel registry).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useListStyles } from '../styles/list.styles';
import { useInboxStyles } from '../styles/inbox.styles';
import { useInboxUi } from '../inbox-store';
import type { ChannelAccount, ChannelMeta, ChannelType } from '../types';

export interface AccountSelectProps {
  accounts: ChannelAccount[];
  channels: Record<ChannelType, ChannelMeta> | undefined;
}

export function AccountSelect({ accounts, channels }: AccountSelectProps) {
  const t = useTranslations('inbox.list');
  const { styles, cx } = useListStyles();
  const { styles: base } = useInboxStyles();
  const ui = useInboxUi();
  const open = ui.pop === 'account';
  const total = accounts.reduce((n, a) => n + a.count, 0);
  const pick = (name: string | null) => {
    ui.set({ account: name });
    ui.closePop();
  };

  return (
    <div className={styles.acct}>
      <button type="button" className={styles.acctBtn} onClick={() => ui.togglePop('account')} aria-expanded={open} data-testid="acct-select">
        <Icon name="ic-users" size={15} color={color.text4} />
        <span className={styles.acctName}>{ui.account ?? t('allAccounts')}</span>
      </button>
      {open ? (
        <>
          <div className={base.veil} onClick={ui.closePop} />
          <div className={styles.acctPop} role="listbox" data-testid="acct-pop">
            <button type="button" className={cx(styles.acctRow, styles.acctAll)} onClick={() => pick(null)}>
              <Icon name="ic-users" size={15} color={color.brandDeep} />
              <span className={cx(styles.acctName, styles.acctAllName)}>{t('allAccounts')}</span>
              <span className={styles.acctCount}>{total}</span>
            </button>
            <div className={styles.sep} />
            {accounts.map((a) => (
              <button key={a.id} type="button" role="option" aria-selected={ui.account === a.name} className={styles.acctRow} onClick={() => pick(a.name)}>
                <span className={cx(styles.chBadge, styles.chBadge20)} style={{ background: channels?.[a.channel].color }}>
                  {channels?.[a.channel].short}
                </span>
                <span className={styles.acctName}>{a.name}</span>
                <span className={styles.acctCount}>{a.count}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
