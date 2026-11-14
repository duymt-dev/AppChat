// Hồ sơ của tôi — mở từ menu avatar (prototype L1034 → goProfile mở Cài đặt › Tổng quan; không có màn riêng). Dựng theo mẫu thẻ / form
// của Tổng quan (L5825–5848): thẻ người dùng (avatar gradient, tên, vai trò hệ thống, email), form "Thông tin cá nhân" (tên, số điện thoại
// → profile.update, quyền self; email chỉ đọc — đổi qua hỗ trợ vì là định danh đăng nhập OTP), ngôn ngữ (vi / en — D22), Đăng xuất.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { useMe } from '@/shared/shell/useShellData';
import { useAuthz } from '@/shared/authz/useCan';
import { writeLocaleCookie } from '@/shared/i18n/locale-cookie';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useGeneralStyles } from '../styles/general.styles';

const LOCALES = ['vi', 'en'] as const;

export function ProfileSection() {
  const t = useTranslations('settings.profile');
  const tr = useTranslations('settings.roleName');
  const s = useSectionStyles().styles;
  const { styles, cx } = useGeneralStyles();
  const q = useMe();
  const role = useAuthz().data?.role;
  const router = useRouter();
  const qc = useQueryClient();
  const save = useAction('profile.update');
  const u = q.data?.user;
  const [v, setV] = useState<{ name: string; phone: string } | null>(null);
  const form = v ?? { name: u?.name ?? '', phone: u?.phone ?? '' };
  const setLocale = async (l: string) => {
    if (await save.run({ locale: l }, { silent: true })) {
      writeLocaleCookie(l);
      router.refresh();
    }
  };
  const logout = async () => {
    await transport.post('/auth/logout');
    qc.clear();
    router.replace('/login');
  };
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {u ? (
        <>
          <div className={s.card}>
            <div className={styles.logoRow}>
              <div className={styles.logo}>{u.initial}</div>
              <div className={s.grow}>
                <div className={styles.wsTitle} data-testid="st-profile-name">
                  {u.name}
                </div>
                <div className={s.muted}>
                  {role ? tr(role) : null} · <span className={styles.code}>{u.email}</span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.form} data-testid="st-profile-form">
            <div className={styles.formT}>{t('info')}</div>
            <div className={styles.formS}>{t('infoD')}</div>
            <div className={styles.fRow}>
              <div className={styles.fLabel}>
                <div className={styles.fL}>{t('name')}</div>
                <div className={styles.fH}>{t('nameH')}</div>
              </div>
              <input className={s.input} value={form.name} onChange={(e) => setV({ ...form, name: e.target.value })} aria-label={t('name')} data-testid="st-profile-name-input" />
            </div>
            <div className={styles.fRow}>
              <div className={styles.fLabel}>
                <div className={styles.fL}>{t('phone')}</div>
              </div>
              <input className={cx(s.input, s.inputW200)} value={form.phone} onChange={(e) => setV({ ...form, phone: e.target.value })} aria-label={t('phone')} data-testid="st-profile-phone" />
            </div>
            <div className={styles.fRow}>
              <div className={styles.fLabel}>
                <div className={styles.fL}>{t('email')}</div>
                <div className={styles.fH}>{t('emailH')}</div>
              </div>
              <input className={cx(s.input, s.inputW240)} value={u.email} disabled aria-label={t('email')} />
            </div>
            <div className={styles.fRow}>
              <div className={styles.fLabel}>
                <div className={styles.fL}>{t('locale')}</div>
              </div>
              <select className={cx(s.input, s.inputW200)} value={u.locale} onChange={(e) => void setLocale(e.target.value)} aria-label={t('locale')} data-testid="st-profile-locale">
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {t(`lang.${l}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.fFoot}>
              <button type="button" className={cx(s.ghost, s.sm)} onClick={() => setV(null)}>
                {t('cancel')}
              </button>
              <button
                type="button"
                className={cx(s.primary, s.sm)}
                disabled={save.isPending || !form.name.trim()}
                onClick={() => void save.run({ name: form.name.trim(), phone: form.phone.trim() }).then((r) => r && setV(null))}
                data-testid="st-profile-save"
              >
                {t('save')}
              </button>
            </div>
          </div>
          <div className={styles.dzT}>{t('session')}</div>
          <div className={s.muted}>{t('sessionD')}</div>
          <div className={styles.dz}>
            <div className={styles.dzRow}>
              <div className={s.grow}>
                <div className={styles.dzL}>{t('logout')}</div>
                <div className={s.muted}>{t('logoutD')}</div>
              </div>
              <button type="button" className={s.dangerGhost} onClick={() => void logout()} data-testid="st-profile-logout">
                {t('logout')}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </PageStates>
  );
}
