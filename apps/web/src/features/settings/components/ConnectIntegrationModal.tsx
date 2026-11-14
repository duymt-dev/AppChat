// Hộp "Kết nối {nhà cung cấp}" — prototype L6250–6266 (440px: logo 52, tiêu đề 20, mô tả, trường, Huỷ / Kết nối gradient).
// Trường sinh từ manifest.auth.fields (provider-ports.md); bí mật chỉ gửi qua integration.connect, không hiện lại. Đã kết nối → Ngắt kết nối.
// Kết nối commerce (`order_sync`): thêm chọn bên giữ tồn chuẩn `stock_master` (TIP-031c) + nhãn "Sắp có" đẩy tồn lên sàn.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useIntegStyles } from '../styles/integrations.styles';
import { useSettingsUi } from '../settings-store';
import { connectorsQuery } from '../api';

const SECRET = ['api_key', 'password', 'hmac_secret', 'webhook_secret', 'api_token'];
const HIDDEN_CONFIG_FIELDS = new Set(['stock_master', 'stock_snapshots', 'orders']);

export function ConnectIntegrationModal() {
  const t = useTranslations('settings.integrations');
  const s = useSectionStyles().styles;
  const { styles } = useIntegStyles();
  const key = useSettingsUi((x) => x.integModal);
  const set = useSettingsUi((x) => x.set);
  const c = useQuery({ ...connectorsQuery(), enabled: !!key }).data?.find((x) => x.key === key);
  const connect = useAction('integration.connect');
  const disconnect = useAction('integration.disconnect');
  const updateSettings = useAction('integration.update_settings');
  const [v, setV] = useState<Record<string, string>>({});
  const [stockOverride, setStockOverride] = useState<'appchat' | 'external' | null>(null);
  if (!key || !c) return null;
  const isCommerce = c.group === 'commerce' || c.port === 'order_sync';
  const stockMaster = stockOverride ?? c.stock_master ?? 'appchat';
  const close = () => {
    setV({});
    setStockOverride(null);
    set({ integModal: null });
  };
  const handleStockMasterChange = async (next: 'appchat' | 'external') => {
    setStockOverride(next);
    if (c.connected) {
      const r = await updateSettings.run({ provider: c.key, stock_master: next });
      if (!r) setStockOverride(null);
    }
  };
  const submit = async () => {
    const fields = isCommerce ? { ...v, stock_master: stockMaster } : v;
    const r = c.connected ? await disconnect.run({ provider: c.key }) : await connect.run({ provider: c.key, fields });
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
          c.fields
            .filter((f) => !HIDDEN_CONFIG_FIELDS.has(f))
            .map((f) => (
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
        {isCommerce && (
          <div className={styles.mField}>
            <div className={styles.mLabel}>{t('stockMaster.label')}</div>
            <select
              className={s.select}
              value={stockMaster}
              disabled={connect.isPending || updateSettings.isPending}
              onChange={(e) => void handleStockMasterChange(e.target.value as 'appchat' | 'external')}
              data-testid="st-int-stock-master"
            >
              <option value="appchat">{t('stockMaster.appchat')}</option>
              <option value="external">{t('stockMaster.external')}</option>
            </select>
            <div className={styles.mDesc}>{t(stockMaster === 'external' ? 'stockMaster.externalHint' : 'stockMaster.appchatHint')}</div>
            {stockMaster === 'appchat' && (
              <span className={styles.bSoon} data-testid="st-int-push-stock-soon">
                {t('stockMaster.pushSoon')}
              </span>
            )}
          </div>
        )}
        <div className={styles.mFoot}>
          <button type="button" className={styles.mCancel} onClick={close}>
            {t('modal.cancel')}
          </button>
          <button
            type="button"
            className={c.connected ? s.dangerBtn : styles.mGo}
            disabled={connect.isPending || disconnect.isPending || updateSettings.isPending}
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
