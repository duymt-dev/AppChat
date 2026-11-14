// Hộp "Cấu hình hạng & điểm" (560px) — thay builder KHI / NẾU / THÌ của prototype L4582–4637 (Blueprint §7.2 loyalty ConfigDialog).
// COMMERCE §7: tỷ lệ tích / đổi, tối đa 50%, hạn 12 tháng, xét hạng theo quý là luật cố định (chỉ hiển thị); đổi được: bật / tắt, hệ số hạng, tích điểm đơn sàn.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useModalStyles } from '../styles/modal.styles';
import { useLoyaltyUi } from '../loyalty-store';
import { loyaltyConfigQuery } from '../api';
import {TIER_TONE } from '../status';
import type { LoyaltyConfig, TierKey } from '../types';
import { useFmt } from '@/shared/i18n/useFmt';

const FIXED = ['earn', 'redeem', 'expiry', 'review'] as const;

export function ConfigModal() {
  const open = useLoyaltyUi((s) => s.config);
  const cfg = useQuery({ ...loyaltyConfigQuery(), enabled: open }).data;
  if (!open || !cfg) return null;
  return <Config cfg={cfg} />;
}

function Config({ cfg }: { cfg: LoyaltyConfig }) {
  const fmt = useFmt();
  const t = useTranslations('loyalty');
  const { message } = App.useApp();
  const { styles, cx } = useModalStyles();
  const set = useLoyaltyUi((s) => s.set);
  const save = useAction('loyalty.update_config');
  const [enabled, setEnabled] = useState(cfg.enabled);
  const [market, setMarket] = useState(cfg.marketplace_earn);
  const [mult, setMult] = useState<Record<string, string>>(() => Object.fromEntries(cfg.tiers.map((x) => [x.key, String(x.mult)])));
  const close = () => set({ config: false });
  const submit = async () => {
    const tiers = cfg.tiers.map((x) => ({ key: x.key as TierKey, mult: Math.max(1, Number(mult[x.key]?.replace(',', '.')) || 1) }));
    const r = await save.run({ enabled, marketplace_earn: market, tiers }, { silent: true });
    if (!r) return;
    void message.success(t('cfg.saved'));
    close();
  };
  return (
    <div className={styles.veil} onClick={close} data-testid="ly-config">
      <div className={cx(styles.box, styles.w560)} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.hT}>{t('cfg.title')}</div>
            <div className={styles.hS}>{t('cfg.sub')}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('cfg.close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <div className={styles.body}>
          <label className={styles.resRow}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} data-testid="ly-cfg-enabled" />
            <span className={styles.grow}>{t('cfg.enabled')}</span>
          </label>
          <div className={styles.res}>
            <div className={styles.resH}>{t('cfg.fixed')}</div>
            {FIXED.map((k) => (
              <div key={k} className={styles.resRow}>
                <span className={styles.grow}>{t(`cfg.${k}`)}</span>
                <span>{t(`cfg.${k}V`)}</span>
              </div>
            ))}
          </div>
          <div className={styles.panel}>
            <div className={styles.tagRow}>
              <span className={styles.tag}>{t('cfg.tiers')}</span>
            </div>
            {cfg.tiers.map((x) => {
              const tone = TIER_TONE[x.key] ?? color.slateAvatar;
              return (
                <div key={x.key} className={styles.two} data-tier={x.key}>
                  <div className={styles.foundRow}>
                    <span className={styles.tier} style={{ background: `${tone}18`, color: tone }}>
                      {t(`tier.${x.key}`)}
                    </span>
                    <span className={styles.muted}>{t('cfg.from', { n: fmt.number(x.min) })}</span>
                  </div>
                  <input
                    className={styles.input}
                    value={mult[x.key] ?? ''}
                    onChange={(e) => setMult((s) => ({ ...s, [x.key]: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    aria-label={`${t('cfg.mult')} ${t(`tier.${x.key}`)}`}
                    data-testid={`ly-cfg-mult-${x.key}`}
                  />
                </div>
              );
            })}
          </div>
          <label className={styles.resRow}>
            <input type="checkbox" checked={market} onChange={(e) => setMarket(e.target.checked)} data-testid="ly-cfg-market" />
            <span className={styles.grow}>
              {t('cfg.market')}
              <div className={styles.muted}>{t('cfg.marketHint')}</div>
            </span>
          </label>
        </div>
        <div className={styles.foot}>
          <span className={styles.grow} />
          <button type="button" className={styles.ghost} onClick={close}>
            {t('cfg.cancel')}
          </button>
          <button type="button" className={styles.primary} disabled={save.isPending} onClick={() => void submit()} data-testid="ly-cfg-save">
            {t('cfg.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
