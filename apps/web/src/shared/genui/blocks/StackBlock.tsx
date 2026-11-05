// Khối `stack`: con xếp dọc.
'use client';
import { Fragment } from 'react';
import { useGenUiStyles } from '../genui.styles';
import { useGenUi } from '../context';
import type { BlockOf, BlockProps } from '../types';

export function StackBlock({ block, path }: BlockProps<BlockOf<'stack'>>) {
  const { styles } = useGenUiStyles();
  const { renderBlock } = useGenUi();
  return (
    <div className={styles.stack} data-testid="genui-stack">
      {block.children.map((c, i) => (
        <Fragment key={i}>{renderBlock(c, path ? `${path}.${i}` : String(i))}</Fragment>
      ))}
    </div>
  );
}
