// Tab "Lịch sử ví" — prototype L6586–6593: lọc loại, lưới Thời gian / Nội dung / Loại / Nguồn / Credit (credit_ledger — Blueprint §2.2:
// grant · topup · usage · refund · adjust · expire). Số tiền VND trong prototype đổi thành credit (REQ-L01).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useWalletStyles } from '../styles/wallet.styles';
import type { WalletData } from '../types';

type Row = WalletData['ledger'][number];
const FILTERS = ['all', 'in', 'out'] as const;
const PLUS = '+';

export function WalletLedger({ rows }: { rows: Row[] }) {
  const t = useTranslations('settings.wallet.ledger');
  const fmt = useFmt();
  const { styles } = useWalletStyles();
  const [f, setF] = useState<(typeof FILTERS)[number]>('all');
  const shown = rows.filter((r) => f === 'all' || (f === 'in' ? r.delta > 0 : r.delta < 0));
  return (
    <div className={styles.table} data-testid="st-wal-ledger">
      <div className={styles.tHead}>
        <div className={styles.tT}>{t('title')}</div>
        <select className={styles.select} value={f} onChange={(e) => setF(e.target.value as typeof f)} aria-label={t('filter')} data-testid="st-wal-ledger-filter">
          {FILTERS.map((k) => (
            <option key={k} value={k}>
              {t(`f.${k}`)}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.th}>
        <span>{t('col.at')}</span>
        <span>{t('col.desc')}</span>
        <span>{t('col.kind')}</span>
        <span>{t('col.source')}</span>
        <span className={styles.delta}>{t('col.credit')}</span>
      </div>
      {shown.map((r) => {
        const inn = r.delta > 0;
        return (
          <div key={r.id} className={styles.tr} data-ledger={r.kind}>
            <span className={styles.at}>{fmt.date(r.at) + ' · ' + fmt.time(r.at)}</span>
            <span className={styles.desc}>{r.desc}</span>
            <span>
              <span className={styles.pill} style={{ background: inn ? color.bonusBg : color.ledgerOut, color: inn ? color.brandInk : color.dangerDeep }}>
                {t(`kind.${r.kind}`)}
              </span>
            </span>
            <span className={styles.src}>{r.source}</span>
            <span className={styles.delta} style={{ color: inn ? color.okStrong : color.dangerStrong }}>
              {(inn ? PLUS : '') + fmt.number(r.delta)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
