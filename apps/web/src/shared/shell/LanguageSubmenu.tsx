// Chỉ hiện ngôn ngữ đã bật (vi / en — D22, ngoại lệ parity `shell:user-menu`).
'use client';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LOCALES } from '@appchat/shared';
import { useAction } from '../actions/useAction';
import { writeLocaleCookie } from '../i18n/locale-cookie';
import { usePopoverStyles } from './popover.styles';
import { useUserMenuStyles } from './user-menu.styles';

export interface LanguageSubmenuProps {
  top: number;
  left: number;
}

export function LanguageSubmenu({ top, left }: LanguageSubmenuProps) {
  const locale = useLocale();
  const router = useRouter();
  const { styles } = useUserMenuStyles();
  const { styles: pop } = usePopoverStyles();
  const update = useAction('profile.update');
  const choose = async (code: string) => {
    writeLocaleCookie(code);
    await update.run({ locale: code }, { silent: true });
    router.refresh();
  };
  return (
    <div className={styles.langSub} style={{ top, left }} data-testid="lang-submenu">
      {LOCALES.filter((l) => l.enabled).map((l) => (
        <div key={l.code} className={pop.row} onClick={() => choose(l.code)}>
          <img className={styles.flag} src={`/flags/${l.flag}.png`} alt="" />
          <span style={{ flex: 1 }}>{l.nativeName}</span>
          <span className={styles.check}>{locale === l.code ? '✓' : ''}</span>
        </div>
      ))}
    </div>
  );
}
