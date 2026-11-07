// "AI hôm nay" (TIP-038 pha 2): lượt AI thật (không dry-run), thao tác Trợ lý / agent / tác vụ, chuyển người, Credit đã dùng (chỉ người quản
// lý agent / ví — người khác thấy "—"). Ngày theo giờ workspace.
'use client';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { SectionCard } from './SectionCard';
import { useWorkStyles } from './work.styles';
import { useFmt } from '@/shared/i18n/useFmt';
import type { AiToday } from '../types';

export function AiTodayPanel({ ai }: { ai: AiToday }) {
  const t = useTranslations('dashboard.aiToday');
  const { styles } = useWorkStyles();
  const fmt = useFmt();
  const cells: [string, number | null][] = [
    ['runs', ai.runs],
    ['actions', ai.actions],
    ['handoffs', ai.handoffs],
    ['credits', ai.credits],
  ];
  return (
    <SectionCard index={6} accent={color.teal} title={t('title')} sub={t('sub')} testId="dash-ai-today">
      <div className={styles.metrics}>
        {cells.map(([k, v]) => (
          <div key={k}>
            <div className={styles.metricLabel}>{t(k as never)}</div>
            <div className={styles.metricValue}>{v === null ? '—' : fmt.number(v)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
