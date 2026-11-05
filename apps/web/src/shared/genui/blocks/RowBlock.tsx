// Khối `row`: con xếp ngang, tự xếp dọc ở mobile (standard §8).
'use client';
import { Fragment } from 'react';
import { useGenUiStyles } from '../genui.styles';
import { useGenUi } from '../context';
import type { BlockOf, BlockProps } from '../types';

export function RowBlock({ block, path }: BlockProps<BlockOf<'row'>>) {
  const { styles } = useGenUiStyles();
  const { renderBlock } = useGenUi();
  return (
    <div className={styles.row} data-testid="genui-row">
      {block.children.map((c, i) => (
        <Fragment key={i}>{renderBlock(c, path ? `${path}.${i}` : String(i))}</Fragment>
      ))}
    </div>
  );
}
