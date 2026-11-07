// Dòng thời gian dọc (Lịch sử tương tác / đa kênh) — prototype L2066–2073, L2194–2206.
'use client';
import { Icon } from '@appchat/ui';
import { usePanelStyles } from '../styles/panel.styles';
import { TIMELINE_TONE } from '../tones';
import type { TimelineItem } from '../types';

export function Timeline({ items }: { items: TimelineItem[] }) {
  const { styles } = usePanelStyles();
  return (
    <>
      {items.map((it) => (
        <div key={it.when + it.text} className={styles.tl}>
          <div className={styles.tlDot}>
            <Icon name={it.icon} size={13} color={TIMELINE_TONE[it.tone]} />
          </div>
          <div className={styles.grow}>
            <div className={styles.tlWhen}>{it.when}</div>
            <div className={styles.tlText}>{it.text}</div>
          </div>
        </div>
      ))}
    </>
  );
}
