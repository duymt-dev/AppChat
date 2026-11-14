// Khung thẻ có số thứ tự của Tổng quan — prototype L1132–1136 (4 thẻ: Kênh / AI Agentic / Module / CDP).
'use client';
import type { ReactNode } from 'react';
import { useDashStyles } from '../dashboard.styles';

export interface SectionCardProps {
  index: number;
  accent: string;
  title: string;
  sub: string;
  children: ReactNode;
  testId?: string;
}

export function SectionCard({ index, accent, title, sub, children, testId }: SectionCardProps) {
  const { styles } = useDashStyles();
  return (
    <section className={styles.card} data-testid={testId}>
      <div className={styles.cardHead}>
        {/* màu số thứ tự theo từng thẻ (prototype) — giá trị động từ token */}
        <div className={styles.num} style={{ background: accent }}>
          {index}
        </div>
        <div className={styles.grow}>
          <div className={styles.cardTitle}>{title}</div>
          <div className={styles.cardSub}>{sub}</div>
        </div>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

export function PillList({ items }: { items: string[] }) {
  const { styles } = useDashStyles();
  return (
    <div className={styles.pills}>
      {items.map((m) => (
        <div key={m} className={styles.pill}>
          {m}
        </div>
      ))}
    </div>
  );
}
