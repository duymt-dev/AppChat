// Menu avatar (prototype L1034). Ẩn "Đối tác tiếp thị" (Affiliate — mục OUT, standards/ui/prototype-parity §6).
'use client';
import { useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color, layout } from '@appchat/ui';
import { useFmt } from '../i18n/useFmt';
import { useAction } from '../actions/useAction';
import { useShellStore } from './shell-store';
import { useMe, type MeWorkspace } from './useShellData';
import { usePopoverStyles } from './popover.styles';
import { useUserMenuStyles } from './user-menu.styles';
import { LanguageSubmenu } from './LanguageSubmenu';

function WorkspaceRow({ ws, active, onClick }: { ws: MeWorkspace; active: boolean; onClick: () => void }) {
  const { styles } = useUserMenuStyles();
  return (
    <div
      className={styles.ws}
      onClick={onClick}
      style={active ? { borderColor: ws.color, background: `${ws.color}10` } : undefined}
    >
      <span className={styles.wsMark} style={{ background: `${ws.color}18`, color: ws.color }}>
        {ws.kind === 'business' ? <Icon name="ic-shield" size={15} color={ws.color} /> : ws.initial}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.wsName}>{ws.name}</div>
        <div className={styles.wsPlan}>{ws.plan}</div>
      </div>
      {active ? <Icon name="ic-check" size={15} strokeWidth={2.2} color={ws.color} /> : null}
    </div>
  );
}

export function UserMenu() {
  const t = useTranslations('shell.user');
  const router = useRouter();
  const { styles } = useUserMenuStyles();
  const { styles: pop } = usePopoverStyles();
  const fmt = useFmt();
  const { data: me } = useMe();
  const setPopover = useShellStore((s) => s.setPopover);
  const switchWs = useAction('workspace.switch');
  const [lang, setLang] = useState<{ top: number; left: number } | null>(null);

  const go = (route: string) => {
    setPopover(null);
    router.push(route);
  };
  const showLang = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setLang({ left: r.right + 6, top: Math.max(8, Math.min(r.top - 8, window.innerHeight - 460)) });
  };
  if (!me) return null;

  return (
    <div className={pop.panel} style={{ width: layout.popoverUser }} data-testid="user-menu">
      <div className={styles.head}>
        <div className={styles.avatar}>{me.user.initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.name}>{me.user.name}</div>
          <div className={styles.sub}>
            {me.user.phone} · {me.user.title}
          </div>
        </div>
        <span className={styles.duty}>
          <i />
          {t('onDuty')}
        </span>
      </div>
      <div className={styles.wsBox}>
        <div className={styles.wsEyebrow}>{t('switchWorkspace')}</div>
        {me.workspaces.map((ws) => (
          <WorkspaceRow
            key={ws.id}
            ws={ws}
            active={ws.id === me.current_workspace_id}
            onClick={() => switchWs.run({ workspace_id: ws.id }, { silent: true })}
          />
        ))}
      </div>
      <div style={{ padding: 6 }}>
        <div className={pop.row} onClick={() => go('/settings/profile')}>
          <Icon name="ic-users" color={color.text3} />
          {t('profile')}
        </div>
        <div className={pop.row} onClick={() => go('/settings/general')}>
          <Icon name="ic-cog" color={color.text3} />
          {t('accountSettings')}
        </div>
        <div onMouseEnter={showLang} onMouseLeave={() => setLang(null)}>
          <div className={pop.row}>
            <Icon name="ic-globe" color={color.text3} />
            <span style={{ flex: 1 }}>{t('language')}</span>
            <Icon name="ic-chevron-right" size={13} strokeWidth={2.2} color={color.text4} />
          </div>
          {lang ? <LanguageSubmenu top={lang.top} left={lang.left} /> : null}
        </div>
        <div className={pop.sep} />
        <div className={pop.row}>
          <Icon name="ic-help" color={color.text3} />
          {t('helpCenter')}
        </div>
        <div className={pop.row}>
          <Icon name="ic-inbox" color={color.text3} />
          {t('supportChat')}
        </div>
        <div className={pop.row} onClick={() => go('/settings/wallet')}>
          <Icon name="ic-gift" color={color.text3} />
          {t('wallet')}
          <span className={styles.wallet}>{fmt.moneyCompact(me.billing.wallet_balance)}</span>
        </div>
        <div className={pop.sep} />
        <div className={pop.row} onClick={() => go('/login')}>
          <Icon name="ic-arrow" color={color.danger} />
          <span className={styles.logout}>{t('logout')}</span>
        </div>
      </div>
    </div>
  );
}
