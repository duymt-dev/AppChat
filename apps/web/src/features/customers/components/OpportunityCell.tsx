// Ô "Cơ hội đang mở" của bảng Khách hàng (TIP-026c §5.2) — prototype L2987: "{tổng} · {n} cơ hội" gạch chân nhạt + chip giai đoạn cao nhất;
// không có → "—". Tiền ẩn theo quyền → chỉ số cơ hội. Bấm mở drawer Cơ hội 360° của cơ hội mở có giai đoạn cao nhất (khớp chip; đọc
// danh sách thật của khách).
'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { isOpportunityClosed, opportunityRank } from '@appchat/shared';
import { useFmt } from '@/shared/i18n/useFmt';
import { opportunitiesQuery, stageColor, stageTint, useOpportunityUi } from '@/shared/opportunities';
import { useCellStyles } from '../styles/cells.styles';
import type { ContactRow } from '../types';

export function OpportunityCell({ c }: { c: ContactRow }) {
  const t = useTranslations('customers');
  const to = useTranslations('common.opportunity');
  const fmt = useFmt();
  const qc = useQueryClient();
  const open = useOpportunityUi((s) => s.open);
  const { styles } = useCellStyles();
  const o = c.open_opportunity;
  if (!o) return <span className={styles.oppNone}>—</span>;
  const n = Number(o.amount_vnd ?? 0);
  const value = o.amount_hidden || !n ? null : n >= 1e9 ? to('billions', { v: fmt.number(Number((n / 1e9).toFixed(2))) }) : to('millions', { v: fmt.number(Number((n / 1e6).toFixed(1))) });
  const go = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const page = await qc.fetchInfiniteQuery(opportunitiesQuery(c.id));
    const open_ = (page.pages[0]?.data ?? []).filter((x) => !isOpportunityClosed(x.stage));
    const top = open_.reduce<(typeof open_)[number] | undefined>((b, x) => (!b || opportunityRank(x.stage) > opportunityRank(b.stage) ? x : b), undefined);
    if (top) open(top.id);
  };
  return (
    <button type="button" className={styles.oppCell} title={t('oppOpen')} onClick={(e) => void go(e)} data-testid={`crm-opp-${c.id}`}>
      <span className={styles.oppVal}>
        {value ? `${value} ` : ''}
        <span>· {t('oppCount', { n: o.count })}</span>
      </span>
      <span className={styles.oppStage} style={{ color: stageColor(o.top_stage), background: stageTint(o.top_stage) }}>
        {to(`stage.${o.top_stage}`)}
      </span>
    </button>
  );
}
