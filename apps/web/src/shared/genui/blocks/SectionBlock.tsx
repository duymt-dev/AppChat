// Khối `section`: tiêu đề + con.
'use client';
import { Fragment } from 'react';
import { useGenUiStyles } from '../genui.styles';
import { useGenUi } from '../context';
import type { BlockOf, BlockProps } from '../types';

export function SectionBlock({ block, path }: BlockProps<BlockOf<'section'>>) {
  const { styles } = useGenUiStyles();
  const { renderBlock } = useGenUi();
  return (
    <section className={styles.section} data-testid="genui-section">
      <div className={styles.sectionTitle}>{block.title}</div>
      {block.children.map((c, i) => (
        <Fragment key={i}>{renderBlock(c, path ? `${path}.${i}` : String(i))}</Fragment>
      ))}
    </section>
  );
}
