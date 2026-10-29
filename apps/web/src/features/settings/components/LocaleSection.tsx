// Mục Ngôn ngữ & vùng — prototype L6270–6276: ngôn ngữ giao diện (chỉ vi / en — D22), múi giờ, định dạng ngày, tiền tệ (VND cố định).
// Ngôn ngữ đổi ngay cho người dùng hiện tại (cookie NEXT_LOCALE + profile.update); còn lại là mặc định workspace (workspace.update).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { writeLocaleCookie } from '@/shared/i18n/locale-cookie';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useLocaleStyles } from '../styles/locale.styles';
import { workspaceQuery } from '../api';
import type { Workspace } from '../types';

const LOCALES = ['vi', 'en'] as const;
const ZONES = ['Asia/Ho_Chi_Minh', 'UTC'] as const;
const DATES = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
const CURRENCIES = ['VND'] as const;

export function LocaleSection() {
  const t = useTranslations('settings.locale');
  const locale = useLocale();
  const router = useRouter();
  const s = useSectionStyles().styles;
  const { styles } = useLocaleStyles();
  const canEdit = useCan('settings.manage');
  const q = useQuery(workspaceQuery());
  const ws = useAction('workspace.update');
  const me = useAction('profile.update');
  const setWs = (patch: Partial<Workspace>) => void ws.run(patch);
  const setLang = async (l: string) => {
    await me.run({ locale: l }, { silent: true });
    writeLocaleCookie(l);
    router.refresh();
  };
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? (
        <div className={styles.box} data-testid="st-locale">
          <div>
            <div className={s.label}>{t('lang')}</div>
            <select className={s.select} value={locale} onChange={(e) => void setLang(e.target.value)} data-testid="st-lang">
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {t(`langs.${l}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className={s.label}>{t('tz')}</div>
            <select className={s.select} value={q.data.workspace.timezone} disabled={!canEdit} onChange={(e) => setWs({ timezone: e.target.value })} data-testid="st-tz">
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {t(`zones.${z === 'UTC' ? 'utc' : 'hcm'}`)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.two}>
            <div>
              <div className={s.label}>{t('date')}</div>
              <select
                className={s.select}
                value={q.data.workspace.date_format}
                disabled={!canEdit}
                onChange={(e) => setWs({ date_format: e.target.value as Workspace['date_format'] })}
                data-testid="st-date"
              >
                {DATES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className={s.label}>{t('currency')}</div>
              <select className={s.select} value={q.data.workspace.currency} disabled aria-describedby="st-cur-note">
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {t('vnd')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </PageStates>
  );
}
