// Nút "Xuất CSV" của khối lịch sử (Hồ sơ 360° — Tổng quan + tab Lịch sử): chỉ hiện khi có `crm.export` (TIP-025b §D.6).
'use client';
import { useTranslations } from 'next-intl';
import { useCan } from '@/shared/authz/useCan';
import { usePanelStyles } from '../styles/panel.styles';
import { useHistoryExport } from '../hooks/useHistoryExport';

export function HistoryCsvButton({ contactId }: { contactId: string }) {
  const t = useTranslations('inbox.p360');
  const tc = useTranslations('common.export');
  const { styles } = usePanelStyles();
  const can = useCan('crm.export');
  const x = useHistoryExport(contactId);
  if (!can) return null;
  return (
    <button type="button" className={styles.link} disabled={x.busy} onClick={() => void x.start()} data-testid="p360-history-csv">
      {x.busy ? tc('running') : t('exportCsv')}
    </button>
  );
}
