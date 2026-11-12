// Trình sửa bộ gợi ý danh mục ticket (TIP-034b §3.2): mỗi nhãn một dòng có thứ tự — sửa tại chỗ, lên / xuống (nút, bàn phím Alt+↑/↓),
// xoá; nhãn đầu là mặc định cho ticket mới. Lỗi kiểm theo dòng (trống / trùng / quá 60 / ký tự điều khiển) từ validator dùng chung.
'use client';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useSectionStyles } from '../styles/section.styles';
import { useCategoriesStyles } from '../styles/categories.styles';
import type { TicketCategoriesForm } from '../hooks/useTicketCategories';

export function CategorySuggestionsEditor({ f, readOnly }: { f: TicketCategoriesForm; readOnly: boolean }) {
  const t = useTranslations('settings.ticketCategories');
  const s = useSectionStyles().styles;
  const { styles } = useCategoriesStyles();
  const list = useRef<HTMLDivElement>(null);
  // Giữ tiêu điểm theo nhãn khi đổi chỗ bằng bàn phím.
  const focusAt = (i: number) => requestAnimationFrame(() => list.current?.querySelectorAll('input')[i]?.focus());
  const move = (i: number, d: -1 | 1) => {
    f.move(i, d);
    focusAt(i + d);
  };
  return (
    <div className={styles.list} ref={list} data-testid="st-cat-list">
      {f.labels.map((label, i) => {
        const err = f.errors[`labels.${i}`];
        return (
          <div key={i} data-testid="st-cat-row">
            <div className={styles.row}>
              <span className={styles.no}>{i + 1}</span>
              <div>
                <input
                  className={s.input}
                  value={label}
                  disabled={readOnly}
                  aria-label={t('label', { n: i + 1 })}
                  aria-invalid={!!err}
                  onChange={(e) => f.set(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
                    e.preventDefault();
                    move(i, e.key === 'ArrowUp' ? -1 : 1);
                  }}
                  data-testid="st-cat-input"
                />
                {i === 0 ? <span className={styles.badge}>{t('default')}</span> : null}
              </div>
              {readOnly ? null : (
                <div className={styles.tools}>
                  <button type="button" className={styles.icon} aria-label={t('up')} disabled={i === 0} onClick={() => move(i, -1)} data-testid="st-cat-up">
                    <Icon name="ic-up" size={16} color={color.text3} />
                  </button>
                  <button type="button" className={styles.icon} aria-label={t('down')} disabled={i === f.labels.length - 1} onClick={() => move(i, 1)} data-testid="st-cat-down">
                    <Icon name="ic-down" size={16} color={color.text3} />
                  </button>
                  <button type="button" className={styles.icon} aria-label={t('remove')} onClick={() => f.remove(i)} data-testid="st-cat-remove">
                    <Icon name="ic-x" size={16} color={color.text3} />
                  </button>
                </div>
              )}
            </div>
            {err ? (
              <div className={styles.err} role="alert" data-testid="st-cat-error">
                {t(`error.${err}` as never)}
              </div>
            ) : null}
          </div>
        );
      })}
      {f.listError ? (
        <div className={styles.err} role="alert" data-testid="st-cat-list-error">
          {t(`error.${f.listError}` as never)}
        </div>
      ) : null}
      {readOnly ? null : (
        <div>
          <button type="button" className={s.ghost} onClick={f.add} data-testid="st-cat-add">
            {t('add')}
          </button>
        </div>
      )}
    </div>
  );
}
