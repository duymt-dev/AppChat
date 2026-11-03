// Đề xuất giá trị đọc từ tệp hợp đồng (TIP-030b spec 7): mỗi ô hiện giá trị + đoạn nguồn + nút "Dùng" (người dùng xác nhận, không tự ghi
// vào form); không đọc được → "Không đọc được — nhập tay". PDF quét / không có chữ → một dòng báo, không bịa.
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { useSourceStyles } from '../../styles/source.styles';
import type { Inspection } from '../../types';

type Field = keyof Inspection['fields'];
const ORDER: Field[] = ['title', 'party_b', 'value', 'start_date', 'end_date'];

export function ExtractionPreview({ x, onUse }: { x: Inspection; onUse: (field: Field, value: string) => void }) {
  const t = useTranslations('contracts.source');
  const fmt = useFmt();
  const { styles } = useSourceStyles();
  if (x.extraction === 'unavailable') return <div className={styles.none} data-testid="ct-extract-none">{t('unavailable')}</div>;
  const show = (k: Field, v: string) => (k === 'value' ? fmt.money(v) : k === 'start_date' || k === 'end_date' ? fmt.date(v) : v);
  return (
    <table className={styles.table} data-testid="ct-extract">
      <thead>
        <tr>
          <th>{t('col.field')}</th>
          <th>{t('col.value')}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {ORDER.map((k) => {
          const p = x.fields[k];
          return (
            <tr key={k} data-testid={`ct-extract-${k}`}>
              <td>{t(`field.${k}`)}</td>
              <td>
                {p ? (
                  <>
                    {show(k, p.value)}
                    <span className={styles.src} title={p.source}>
                      {t('from', { text: p.source.slice(0, 80) })}
                    </span>
                  </>
                ) : (
                  <span className={styles.none}>{t('missing')}</span>
                )}
              </td>
              <td>
                {p && k !== 'party_b' ? (
                  <button type="button" className={styles.use} onClick={() => onUse(k, p.value)} data-testid={`ct-use-${k}`}>
                    {t('use')}
                  </button>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
