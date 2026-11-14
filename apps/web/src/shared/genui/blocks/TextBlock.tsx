// Khối `text`: văn bản thuần của model (standard §6) — không markdown / HTML / link; tone → màu token.
'use client';
import { TONE, useGenUiStyles } from '../genui.styles';
import type { BlockOf, BlockProps } from '../types';

export function TextBlock({ block }: BlockProps<BlockOf<'text'>>) {
  const { styles } = useGenUiStyles();
  const tone = block.tone && block.tone !== 'default' ? { color: TONE[block.tone].fg } : undefined;
  return (
    <p className={styles.text} style={{ margin: 0, ...tone }} data-testid="genui-text">
      {block.text}
    </p>
  );
}
