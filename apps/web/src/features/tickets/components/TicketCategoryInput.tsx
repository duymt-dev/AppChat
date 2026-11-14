// Danh mục ticket (TIP-034b §2.5): combobox CHỮ TỰ DO (ARIA combobox + listbox) — gõ nhãn bất kỳ hoặc chọn từ nhóm "Gợi ý" (bộ cấu hình) /
// "Đã dùng trong ticket" (nhãn ticket người xem thấy, tải thêm theo trang). Nhãn cũ ngoài danh sách (kể cả dài hơn 60) vẫn giữ nguyên.
// Bộ lọc dùng <select> gốc (giữ khung prototype) với hai optgroup + "Tải thêm"; giá trị lọc đang chọn luôn có trong danh sách.
'use client';
import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCategoryStyles } from '../styles/category.styles';
import type { CategoryOptions } from '../hooks/useCategorySuggestions';

const MORE = '\u0000more';
const fold = (s: string) => s.normalize('NFC').toLowerCase();

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  options: CategoryOptions;
  className: string;
  label: string;
  testId?: string;
}

export function TicketCategoryInput({ value, onChange, options, className, label, testId }: InputProps) {
  const t = useTranslations('tickets.categoryInput');
  const { styles, cx } = useCategoryStyles();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(-1);
  const q = typed ? fold(value.trim()) : '';
  const match = (l: string) => !q || fold(l).includes(q);
  const groups = [
    { key: 'suggested', items: options.configured.filter(match) },
    { key: 'used', items: options.used.filter(match) },
  ] as const;
  const flat = groups.flatMap((g) => g.items);
  const pick = (l: string) => {
    onChange(l);
    setTyped(false);
    setOpen(false);
    setActive(-1);
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const d = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (flat.length ? (i + d + flat.length) % flat.length : -1));
    } else if (e.key === 'Enter' && open && active >= 0 && flat[active] !== undefined) {
      e.preventDefault();
      pick(flat[active]!);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };
  let n = -1;
  return (
    <div className={styles.box}>
      <input
        className={className}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTyped(true);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKey}
        data-testid={testId}
      />
      {open ? (
        <div className={styles.pop} data-testid="tk-category-pop" onMouseDown={(e) => e.preventDefault()}>
          <div role="listbox" id={`${id}-list`} aria-label={label}>
            {groups.map((g) =>
              g.items.length ? (
                <div key={g.key} role="group" aria-label={t(g.key)}>
                  <div className={styles.head} aria-hidden>
                    {t(g.key)}
                  </div>
                  {g.items.map((l) => {
                    n += 1;
                    const i = n;
                    return (
                      <div
                        key={l}
                        id={`${id}-${i}`}
                        role="option"
                        aria-selected={l === value}
                        className={cx(styles.opt, i === active && styles.on)}
                        onClick={() => pick(l)}
                        data-testid={`tk-category-opt-${g.key}`}
                      >
                        {l}
                      </div>
                    );
                  })}
                </div>
              ) : null,
            )}
          </div>
          {!flat.length ? <div className={styles.empty}>{t('free', { q: value.trim() })}</div> : null}
          {options.hasMore ? (
            <button type="button" className={cx(styles.opt, styles.more)} disabled={options.loading} onClick={options.loadMore} data-testid="tk-category-more">
              {t('more')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface FilterProps {
  value: string;
  onPick: (v: string) => void;
  options: CategoryOptions;
  className: string;
  label: string;
}

/** Bộ lọc danh mục: khớp ĐÚNG chuỗi; "Tải thêm" đọc trang nhãn đã dùng kế tiếp, không đổi bộ lọc. */
export function CategoryFilterSelect({ value, onPick, options, className, label }: FilterProps) {
  const t = useTranslations('tickets.categoryInput');
  const known = value === 'all' || options.configured.includes(value) || options.used.includes(value);
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => (e.target.value === MORE ? options.loadMore() : onPick(e.target.value))}
      aria-label={label}
      data-testid="tk-f-category"
    >
      <option value="all">{label}</option>
      {known ? null : <option value={value}>{value}</option>}
      <optgroup label={t('suggested')}>
        {options.configured.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </optgroup>
      {options.used.length ? (
        <optgroup label={t('used')}>
          {options.used.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </optgroup>
      ) : null}
      {options.hasMore ? <option value={MORE}>{t('more')}</option> : null}
    </select>
  );
}
