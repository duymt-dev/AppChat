// Ô soạn của Trợ lý — prototype L1201–1222 (màn chào), L1294–1311 (đáy hội thoại), L1404–1419 (Cowork).
// Mức AI thay tên model (D29). Enter gửi, Shift+Enter xuống dòng.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useComposerStyles } from '../styles/composer.styles';
import { useAssistantUi } from '../assistant-store';
import type { Mode } from '../types';

const MODES: Mode[] = ['chat', 'cowork'];

export interface ComposerProps {
  rows: number;
  placeholder: string;
  onSend: () => void;
  /** Màn chào có thêm nút ⚡ lệnh nhanh và mic. */
  full?: boolean;
  sendIcon?: 'up' | 'plane';
  onMode?: (m: Mode) => void;
  testId?: string;
}

export function Composer({ rows, placeholder, onSend, full, sendIcon = 'up', onMode, testId }: ComposerProps) {
  const t = useTranslations('assistant');
  const { styles, cx } = useComposerStyles();
  const ui = useAssistantUi();
  const setMode = (m: Mode) => (onMode ? onMode(m) : ui.set({ mode: m, pop: null }));

  return (
    <div className={styles.box} data-testid={testId}>
      <textarea
        className={styles.area}
        rows={rows}
        value={ui.draft}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => ui.set({ draft: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <div className={styles.row}>
        <button type="button" className={styles.icoBtn} aria-label={t('attach')} data-testid="asst-plus" onClick={(e) => ui.openPop('plus', e.currentTarget)}>
          <Icon name="ic-plus" size={17} />
        </button>
        {full ? (
          <button type="button" className={styles.icoBtn} aria-label={t('quick')}>
            <Icon name="ic-bolt" size={17} />
          </button>
        ) : null}
        <div className={styles.seg} role="radiogroup">
          {MODES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={ui.mode === m} className={cx(styles.segBtn, ui.mode === m && styles.segOn)} onClick={() => setMode(m)}>
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
        {ui.mode === 'cowork' ? (
          <button type="button" className={styles.agentChip} data-testid="asst-agent" onClick={(e) => ui.openPop('agent', e.currentTarget)}>
            <Icon name="ic-bot" size={13} color={color.violet} strokeWidth={2} />
            {ui.agent ? t('agentSuffix', { name: ui.agent }) : t('agentNone')}
          </button>
        ) : null}
        <span className={styles.grow} />
        <button type="button" className={styles.tierPill} data-testid="asst-tier" onClick={(e) => ui.openPop('tier', e.currentTarget)}>
          {t(`tier.${ui.tier}`)}
          <span className={styles.effort}>{t('tier.effortHigh')}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" style={{ stroke: color.text3, fill: 'none', strokeWidth: 2.2 }} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {full ? (
          <button type="button" className={styles.mic} aria-label={t('voice')} title={t('voice')}>
            <Icon name="ic-mic" size={17} />
          </button>
        ) : null}
        <button type="button" className={styles.send} aria-label={t('send')} data-testid="asst-send" onClick={onSend}>
          {sendIcon === 'plane' ? (
            <Icon name="ic-send" size={17} color={color.white} strokeWidth={1.3} style={{ fill: color.white }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ stroke: color.white, fill: 'none', strokeWidth: 2.2 }} aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
