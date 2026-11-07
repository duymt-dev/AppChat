// Thống kê thẻ agent (TIP-038 mục 2): hội thoại · tỷ lệ lượt tự xử lý · CSAT — mỗi ô có tooltip định nghĩa (tử / mẫu số, nguồn, giới hạn)
// + so sánh người thật cùng kỳ. Chỉ số không khả dụng (chưa có mẫu / thiếu quyền nguồn) → "—" kèm lý do, khác số 0 thật. Bố cục giữ
// đúng ba ô của prototype (L1340–1384); chi tiết nằm trong tooltip.
'use client';
import { Tooltip } from 'antd';
import { useTranslations } from 'next-intl';
import type { AgentStatsDto, StatValueDto } from '@appchat/shared';
import { useFmt } from '@/shared/i18n/useFmt';
import { useAgentStats } from '../hooks/useAgentStats';
import { useMineStyles } from '../styles/mine.styles';

type Key = 'conversations' | 'resolve_rate' | 'csat';
const CELLS: { key: Key; label: string; pct?: boolean }[] = [
  { key: 'conversations', label: 'mine.conv' },
  { key: 'resolve_rate', label: 'mine.resolve', pct: true },
  { key: 'csat', label: 'mine.csat' },
];

export function AgentStatsPanel({ agentId, initial }: { agentId: string; initial?: AgentStatsDto }) {
  const t = useTranslations('agents');
  const fmt = useFmt();
  const { styles } = useMineStyles();
  const { data: s } = useAgentStats(agentId, initial);

  const show = (v: StatValueDto | undefined, pct?: boolean) => {
    if (!v?.available || v.value === null) return t('mine.dash');
    return pct ? t('ai.pct', { n: fmt.number(v.value) }) : fmt.number(v.value);
  };
  const why = (v: StatValueDto | undefined) => (v && !v.available ? t(v.reason?.startsWith('permission') || v.reason?.startsWith('scope') ? 'stats.noAccess' : 'stats.noData') : null);
  const tip = (k: Key) => {
    if (!s) return null;
    const v = s[k];
    const lines = [t(`stats.def.${k}`, { n: v.n }), why(v)];
    if (k === 'csat') lines.push(t('stats.human', { v: show(s.human.csat), n: s.human.csat.n }));
    if (k === 'resolve_rate') lines.push(t('stats.close', { v: show(s.close_rate, true), n: s.close_rate.n }));
    return lines.filter(Boolean).map((l) => <div key={l!}>{l}</div>);
  };

  return (
    <div className={styles.stats} data-testid="ag-stats">
      {CELLS.map((c) => (
        <Tooltip key={c.key} title={tip(c.key)}>
          <div data-testid={`ag-stat-${c.key}`} data-available={s ? String(s[c.key].available) : undefined}>
            <div className={styles.statL}>{t(c.label)}</div>
            <div className={styles.statV}>{show(s?.[c.key], c.pct)}</div>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
