// Thanh tab trên hộp thư — prototype L1584–1597: nút rail thư mục · 7 tab có đếm · nút "Trợ lý AI".
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useInboxStyles } from '../styles/inbox.styles';
import { useInboxUi } from '../inbox-store';
import type { FolderCounts } from '../types';

const DOT = { brand: color.brand, amber: color.warnAmber, violet: color.violet } as const;

export function TopTabs({ counts }: { counts: FolderCounts | undefined }) {
  const t = useTranslations('inbox');
  const { styles, cx } = useInboxStyles();
  const ui = useInboxUi();

  return (
    <div className={styles.tabbar}>
      <button type="button" className={styles.railBtn} onClick={ui.toggleRail} aria-label={t('folders.toggle')} aria-pressed={ui.folderRail} data-testid="inbox-rail-toggle">
        <Icon name="ic-menu" size={15} strokeWidth={1.9} color={color.text3} />
      </button>
      <div className={styles.tabs} role="tablist">
        {(counts?.tabs ?? []).map(([key, n, dot]) => {
          const on = ui.tab === key;
          return (
            <button key={key} type="button" role="tab" aria-selected={on} className={cx(styles.tab, on && styles.tabOn)} onClick={() => ui.set({ tab: key })}>
              {/* màu chấm theo loại tab (token) */}
              {dot ? <span className={styles.dot} style={{ background: DOT[dot] }} /> : null}
              {t(`tabs.${key}` as never)}
              <span className={cx(styles.count, on && styles.countOn)}>{n}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className={styles.aiBtn} onClick={() => ui.set({ modal: 'ai' })} data-testid="inbox-ai-open">
        <Icon name="ic-spark" size={14} strokeWidth={1.9} color={color.brandInk} />
        <span className={styles.aiLabel}>{t('assistant')}</span>
      </button>
    </div>
  );
}
