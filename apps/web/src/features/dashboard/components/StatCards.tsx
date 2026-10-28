// 4 thẻ thống kê nhanh — prototype L1131.
'use client';
import { Icon, color } from '@appchat/ui';
import { useDashStyles } from '../dashboard.styles';
import type { StatCard } from '../types';

export function StatCards({ stats }: { stats: StatCard[] }) {
  const { styles, cx } = useDashStyles();
  return (
    <div className={styles.stats} data-testid="dash-stats">
      {stats.map((s) => (
        <div key={s.label} className={styles.stat}>
          <div className={styles.grow}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={cx(styles.statNote, styles[s.tone])}>{s.note}</div>
          </div>
          <div className={styles.statIcon}>
            <Icon name={s.icon} size={15} strokeWidth={1.9} color={color.okText} />
          </div>
        </div>
      ))}
    </div>
  );
}
