// Nút "Sắp xếp" của thanh công cụ Khách hàng (prototype L2509 — chỉ có nút): bấm mở danh sách 4 cách sắp xếp, mục đang chọn có ✓.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCrmStyles } from '../styles/crm.styles';
import { useSortStyles } from '../styles/sort.styles';
import type { ContactSort } from '../types';

const SORTS: ContactSort[] = ['recent', 'name', 'created', 'value'];

export function SortMenu({ value, onChange }: { value: ContactSort; onChange: (v: ContactSort) => void }) {
  const t = useTranslations('customers');
  const { styles, cx } = useCrmStyles();
  const { styles: s } = useSortStyles();
  const [open, setOpen] = useState(false);
  return (
    <div className={cx(s.rel, styles.hideMd)}>
      <button type="button" className={cx(styles.chip, styles.tool)} aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="crm-sort">
        <Icon name="ic-sort" size={13} color={color.text3} />
        {value === 'recent' ? t('sort') : t(`sorts.${value}`)}
      </button>
      {open ? (
        <>
          <div className={s.veil} onClick={() => setOpen(false)} />
          <div className={s.pop} role="menu" aria-label={t('sort')}>
            {SORTS.map((k) => (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={value === k}
                className={s.item}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                data-testid={`crm-sort-${k}`}
              >
                <span className={s.grow}>{t(`sorts.${k}`)}</span>
                {value === k ? <Icon name="ic-check" size={14} color={color.brand} strokeWidth={2} /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
