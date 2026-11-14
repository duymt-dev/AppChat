// Khối `button_group`: ≤ 4 nút, cùng luật từng nút (ẩn nút action không có intent).
'use client';
import { useGenUiStyles } from '../genui.styles';
import type { BlockOf, BlockProps } from '../types';
import { ButtonBlock } from './ButtonBlock';

export function ButtonGroupBlock({ block, path }: BlockProps<BlockOf<'button_group'>>) {
  const { styles } = useGenUiStyles();
  return (
    <div className={styles.buttons} data-testid="genui-button-group">
      {block.buttons.map((b, i) => (
        <ButtonBlock key={i} block={b} path={path ? `${path}.${i}` : String(i)} />
      ))}
    </div>
  );
}
