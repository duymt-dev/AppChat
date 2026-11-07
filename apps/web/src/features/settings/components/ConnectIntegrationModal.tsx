// Hộp "Kết nối {nhà cung cấp}" — prototype L6250–6266 (440px: logo 52, tiêu đề 20, mô tả, trường, Huỷ / Kết nối gradient).
// Trường sinh từ manifest.auth.fields (provider-ports.md); bí mật chỉ gửi qua integration.connect, không hiện lại. Đã kết nối → Ngắt kết nối.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useIntegStyles } from '../styles/integrations.styles';
import { useSettingsUi } from '../settings-store';
import { connectorsQuery } from '../api';

const SECRET = ['api_key', 'password'];

export function ConnectIntegrationModal() {
  const t = useTranslations('settings.integrations');
  const s = useSectionStyles().styles;
  const { styles } = useIntegStyles();
  const key = useSettingsUi((x) => x.integModal);
  const set = useSettingsUi((x) => x.set);
  const c = useQuery({ ...connectorsQuery(), enabled: !!key }).data?.find((x) => x.key === key);
  const connect = useAction('integration.connect');
  const disconnect = useAction('integration.disconnect');
  const [v, setV] = useState<Record<string, string>>({});
  if (!key || !c) return null;
  const close = () => {
    setV({});
    set({ integModal: null });
  };
  const submit = async () => {
    const r = c.connected ? await disconnect.run({ provider: c.key }) : await connect.run({ provider: c.key, fields: v });
    if (r) close();
  };
  return (
    <div className={styles.veil} onClick={close} data-testid="st-int-modal">
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('modal.title', { n: c.name })} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mHead}>
          <span className={styles.mLogo} style={{ color: c.color }}>
            {c.name[0]}
          </span>
          <div className={styles.grow}>
            <div className={styles.mT}>{t('modal.title', { n: c.name })}</div>
            <div className={styles.mS}>{t('modal.sub')}</div>
          </div>
        </div>
        <div className={styles.mDesc}>{t(`desc.${c.key}`)}</div>
        {c.connected ? (
          <div className={styles.mDesc}>{t('modal.connectedD')}</div>
        ) : (
          c.fields.map((f) => (
            <div key={f} className={styles.mField}>
              <div className={styles.mLabel}>{t(`field.${f}`)}</div>
              <input
                className={s.input}
                type={SECRET.includes(f) ? 'password' : 'text'}
                value={v[f] ?? ''}
                onChange={(e) => setV({ ...v, [f]: e.target.value })}
                placeholder={t('modal.ph')}
                autoComplete="off"
                data-testid={`st-int-f-${f}`}
              />
            </div>
          ))
        )}
        <div className={styles.mFoot}>
          <button type="button" className={styles.mCancel} onClick={close}>
            {t('modal.cancel')}
          </button>
          <button
            type="button"
            className={c.connected ? s.dangerBtn : styles.mGo}
            disabled={connect.isPending || disconnect.isPending}
            onClick={() => void submit()}
            data-testid="st-int-save"
          >
            {t(c.connected ? 'modal.disconnect' : 'modal.connect')}
          </button>
        </div>
      </div>
    </div>
  );
}
