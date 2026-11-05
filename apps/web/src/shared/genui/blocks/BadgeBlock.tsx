// Khối `badge`: nhãn ngắn, tone ngữ nghĩa → (chữ, nền) token.
'use client';
import { TONE, useGenUiStyles } from '../genui.styles';
import type { BlockOf, BlockProps } from '../types';

export function BadgeBlock({ block }: BlockProps<BlockOf<'badge'>>) {
  const { styles } = useGenUiStyles();
  const t = TONE[block.tone ?? 'default'];
  return (
    <span className={styles.badge} style={{ color: t.fg, background: t.bg }} data-testid="genui-badge">
      {block.text}
    </span>
  );
}
