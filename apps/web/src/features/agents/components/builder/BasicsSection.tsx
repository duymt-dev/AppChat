// Cấu hình cơ bản — prototype L2305–2320: biểu tượng (popover 12 emoji), tên, "Hiển thị mô tả" (mở vai trò hiển thị + tính cách —
// thẻ agent hiện vai trò), Mức AI (D29 thay "Mô hình AI"), ngôn ngữ.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useBuilderStyles } from '../../styles/builder.styles';
import type { AgentConfig, Lang, Tier } from '../../types';

const TIERS: Tier[] = ['standard', 'advanced', 'max'];
const LANGS: Lang[] = ['vi', 'en', 'bilingual', 'auto'];

export interface SectionProps {
  cfg: AgentConfig;
  patch: (p: Partial<AgentConfig>) => void;
}

export function BasicsSection({ cfg, patch, emojis }: SectionProps & { emojis: string[] }) {
  const t = useTranslations('agents');
  const { styles, cx } = useBuilderStyles();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState(!!(cfg.role_label || cfg.persona));

  return (
    <>
      <div className={styles.h}>{t('b.config')}</div>
      <div className={styles.hSub}>{t('b.configSub')}</div>
      <div className={styles.nameRow}>
        <div className={styles.emojiWrap}>
          <div className={styles.label}>{t('b.emoji')}</div>
          <button type="button" className={styles.emoji} onClick={() => setOpen((v) => !v)} aria-label={t('b.emoji')} aria-expanded={open} data-testid="agb-emoji">
            {cfg.emoji}
          </button>
          {open ? (
            <div className={styles.emojiPop} role="menu" data-testid="agb-emoji-pop">
              {emojis.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="menuitem"
                  className={styles.emojiOpt}
                  onClick={() => {
                    patch({ emoji: e });
                    setOpen(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.grow}>
          <div className={styles.label}>
            {t('b.name')} <span className={styles.info}>{t('b.nameInfo')}</span>
          </div>
          <input
            className={styles.input}
            value={cfg.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={t('b.namePh')}
            aria-label={t('b.name')}
            maxLength={80}
            data-testid="agb-name"
          />
        </div>
      </div>
      <button type="button" className={styles.link} onClick={() => setDesc((v) => !v)} aria-expanded={desc} data-testid="agb-desc-toggle">
        {desc ? t('b.hideDesc') : t('b.showDesc')}
      </button>
      {desc ? (
        <div className={styles.two}>
          <div>
            <div className={styles.label}>{t('b.roleLabel')}</div>
            <input className={styles.input} value={cfg.role_label} onChange={(e) => patch({ role_label: e.target.value })} placeholder={t('b.roleLabelPh')} aria-label={t('b.roleLabel')} maxLength={80} data-testid="agb-role-label" />
          </div>
          <div>
            <div className={styles.label}>{t('b.persona')}</div>
            <input className={styles.input} value={cfg.persona} onChange={(e) => patch({ persona: e.target.value })} placeholder={t('b.personaPh')} aria-label={t('b.persona')} maxLength={500} data-testid="agb-persona" />
          </div>
        </div>
      ) : null}
      <div className={styles.two}>
        <div>
          <div className={styles.label}>{t('b.tier')}</div>
          <select className={styles.field} value={cfg.model_tier} onChange={(e) => patch({ model_tier: e.target.value as Tier })} aria-label={t('b.tier')} data-testid="agb-tier">
            {TIERS.map((k) => (
              <option key={k} value={k}>
                {t(`tier.${k}`)}
              </option>
            ))}
          </select>
          <div className={cx(styles.help, styles.tierHelp)}>{t(`tierDesc.${cfg.model_tier}`)}</div>
        </div>
        <div>
          <div className={styles.label}>{t('b.lang')}</div>
          <select className={styles.field} value={cfg.language} onChange={(e) => patch({ language: e.target.value as Lang })} aria-label={t('b.lang')}>
            {LANGS.map((k) => (
              <option key={k} value={k}>
                {t(`b.langs.${k}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
