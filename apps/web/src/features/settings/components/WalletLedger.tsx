// Tab "Lịch sử ví" — prototype L6586–6593 + "Lịch sử chi tiêu Credit" L6152 (lọc module / kỳ): lưới Thời gian / Nội dung / Loại / Nguồn /
// Credit (credit_ledger — Blueprint §2.2: grant · topup · usage · refund · adjust · expire). TIP-039: lọc vào-ra / nguồn / kỳ ở SERVER
// (useWalletLedger), "Xem thêm" theo cursor — đủ lịch sử, không chỉ 50 dòng đầu. Số tiền VND trong prototype đổi thành credit (REQ-L01).
'use client';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useWalletStyles } from '../styles/wallet.styles';
import { LEDGER_DIRS, LEDGER_PERIODS, LEDGER_SOURCES, useWalletLedger } from '../hooks/useWalletLedger';

const PLUS = '+';

export function WalletLedger() {
  const t = useTranslations('settings.wallet.ledger');
  const fmt = useFmt();
  const { styles } = useWalletStyles();
  const { f, set, rows, q } = useWalletLedger();
  return (
    <div className={styles.table} data-testid="st-wal-ledger">
      <div className={styles.tHead}>
        <div className={styles.tT}>{t('title')}</div>
        <select className={styles.select} value={f.source} onChange={(e) => set({ source: e.target.value as typeof f.source })} aria-label={t('source')} data-testid="st-wal-ledger-source">
          {LEDGER_SOURCES.map((k) => (
            <option key={k} value={k}>
              {t(`src.${k}`)}
            </option>
          ))}
        </select>
        <select className={styles.select} value={f.period} onChange={(e) => set({ period: e.target.value as typeof f.period })} aria-label={t('period')} data-testid="st-wal-ledger-period">
          {LEDGER_PERIODS.map((k) => (
            <option key={k} value={k}>
              {t(`p.${k}`)}
            </option>
          ))}
        </select>
        <select className={styles.select} value={f.dir} onChange={(e) => set({ dir: e.target.value as typeof f.dir })} aria-label={t('filter')} data-testid="st-wal-ledger-filter">
          {LEDGER_DIRS.map((k) => (
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
      {q.isError ? <div className={styles.src} data-testid="st-wal-ledger-error">{t('error')}</div> : null}
      {!q.isPending && !q.isError && !rows.length ? <div className={styles.src} data-testid="st-wal-ledger-empty">{t('empty')}</div> : null}
      {rows.map((r) => {
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
      {q.hasNextPage ? (
        <button type="button" className={styles.select} onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage} data-testid="st-wal-ledger-more">
          {t('more')}
        </button>
      ) : null}
    </div>
  );
}
