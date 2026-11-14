// Xem trước dòng đã chuẩn hoá (TIP-038b P4): lọc theo kết quả kiểm (tất cả / hợp lệ / lỗi / trùng), 50 dòng đầu từ server (không đọc lại
// tệp ở trình duyệt). Dòng lỗi ghi rõ trường + mã lỗi; dòng hợp lệ có cảnh báo (`*_warning` — cập nhật SKU có sẵn, định dạng mô tả sẽ reset
// TIP-027b) ghi kèm để người dùng thấy trước khi xác nhận; giá trị đã chuẩn hoá (SĐT giữ 0 đầu, tiền chuỗi chữ số).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { transferSpec } from '@appchat/shared';
import { PREVIEW_LIMIT, transferRowsQuery, type RowCheck } from '../api';
import { useTransferStyles } from '../styles/transfer.styles';
import type { TransferPlanDto } from '../types';

const TABS: (RowCheck | null)[] = [null, 'valid', 'invalid', 'duplicate'];

export function PreviewTable({ plan }: { plan: TransferPlanDto }) {
  const t = useTranslations('data-transfer');
  const { styles: s, cx } = useTransferStyles();
  const [check, setCheck] = useState<RowCheck | null>(null);
  const rows = useQuery(transferRowsQuery(plan.id, check, plan.version));
  const mapped = transferSpec(plan.entity).fields.filter((f) => plan.mapping[f.key]);
  const data = rows.data?.data ?? [];
  const label = (ns: 'field' | 'error', k: string) => (t.has(`${ns}.${k}` as never) ? t(`${ns}.${k}` as never) : k);
  const warnings = (e: Record<string, string>) => Object.keys(e).filter((k) => k.endsWith('_warning')).map((k) => label('error', k));
  return (
    <>
      <div className={s.tabs} role="tablist">
        {TABS.map((c) => (
          <button key={c ?? 'all'} type="button" role="tab" aria-selected={check === c} className={cx(s.pill, check === c && s.pillOn)} onClick={() => setCheck(c)} data-check={c ?? 'all'}>
            {t(`check.${c ?? 'all'}`)}
          </button>
        ))}
      </div>
      <div className={s.scroll}>
        <table className={s.table} data-testid="dt-preview">
          <thead>
            <tr>
              <th>{t('rowNo')}</th>
              <th>{t('checkCol')}</th>
              {mapped.map((f) => (
                <th key={f.key}>{t(`field.${f.key}` as never)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.row_no} data-row={r.row_no} data-check={r.check}>
                <td>{r.row_no}</td>
                <td className={r.check === 'invalid' ? s.bad : r.check !== 'valid' ? s.muted : warnings(r.errors).length ? s.warn : undefined}>
                  {r.check === 'invalid'
                    ? Object.entries(r.errors).map(([k, code]) => t('rowError', { field: label('field', k), error: label('error', code) })).join(t('errorSep'))
                    : [t(`check.${r.check}`), ...(r.check === 'valid' ? warnings(r.errors) : [])].join(t('errorSep'))}
                </td>
                {mapped.map((f) => (
                  <td key={f.key}>{r.data[f.key] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.data?.next_cursor ? <div className={s.note}>{t('previewMore', { n: PREVIEW_LIMIT })}</div> : null}
    </>
  );
}
