// Hàng "Việc cần tôi" + cột phải (AI hôm nay, Credit) — TIP-038 pha 2. Credit null (không quyền ví) → không hiện thẻ.
'use client';
import { AiTodayPanel } from './AiTodayPanel';
import { CreditBalanceCard } from './CreditBalanceCard';
import { MyWorkPanel } from './MyWorkPanel';
import { useWorkStyles } from './work.styles';
import type { AiToday, CreditInfo, WorkItem } from '../types';

export function WorkSection({ work, ai, credit }: { work: WorkItem[]; ai: AiToday; credit: CreditInfo | null }) {
  const { styles } = useWorkStyles();
  return (
    <div className={styles.grid}>
      <MyWorkPanel items={work} />
      <div className={styles.side}>
        <AiTodayPanel ai={ai} />
        {credit ? <CreditBalanceCard credit={credit} /> : null}
      </div>
    </div>
  );
}
