// Kết quả nhập (TIP-038b P4): số đếm THẬT từ kế hoạch (receipts) — đã ghi / bỏ qua / lỗi; đang ghi nền thì hiện tiến độ, không báo xong
// trước. Huỷ khi đang ghi: lô đang chạy hoàn tất, phần đã ghi giữ nguyên (không "hoàn tác tất cả" giả).
'use client';
import { useTranslations } from 'next-intl';
import { useTransferStyles } from '../styles/transfer.styles';
import type { TransferPlanDto } from '../types';

const KEYS = ['applied', 'skipped', 'failed'] as const;

export function TransferResult({ plan }: { plan: TransferPlanDto }) {
  const t = useTranslations('data-transfer');
  const { styles: s, cx } = useTransferStyles();
  return (
    <div data-testid="dt-result" data-status={plan.status}>
      <div className={s.note}>{t(`status.${plan.status}`)}</div>
      <div className={s.stats}>
        {KEYS.map((k) => (
          <div key={k} className={cx(s.stat, k === 'failed' && plan.counts.failed > 0 && s.statBad)} data-stat={k}>
            <b>{plan.counts[k]}</b>
            {t(`result.${k}`)}
          </div>
        ))}
      </div>
      {plan.error ? <div className={s.err}>{t.has(`error.${plan.error}` as never) ? t(`error.${plan.error}` as never) : plan.error}</div> : null}
    </div>
  );
}
