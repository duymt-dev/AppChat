// Khối `stat_group`: lưới stat — compact tối đa 3 / hàng, full tối đa 6 (standard §9).
'use client';
import { GENUI_COMPACT, GENUI_LIMITS } from '@appchat/shared';
import { useGenUi } from '../context';
import { useGenUiStyles } from '../genui.styles';
import type { BlockOf, BlockProps } from '../types';
import { StatBlock } from './StatBlock';

export function StatGroupBlock({ block, path }: BlockProps<BlockOf<'stat_group'>>) {
  const { styles } = useGenUiStyles();
  const { mode } = useGenUi();
  const cols = Math.min(block.stats.length, mode === 'compact' ? GENUI_COMPACT.statsPerRow : GENUI_LIMITS.statGroup);
  return (
    <div className={styles.statGroup} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} data-testid="genui-stat-group">
      {block.stats.map((s, i) => (
        <StatBlock key={i} block={s} path={path ? `${path}.${i}` : String(i)} />
      ))}
    </div>
  );
}
