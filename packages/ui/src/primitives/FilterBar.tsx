// FilterBar (Blueprint §7 primitive): pill trạng thái / giai đoạn + công tắc chế độ xem (StageTabs) và hàng select + popover "Lọc nâng cao".
// Prototype L2469–2512. Màn truyền nhãn đã dịch; component không biết nghiệp vụ.
'use client';
import { useState, type ReactNode } from 'react';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import type { IconName } from '../icons/paths';
import { color, font, layout, radius, shadow } from '../tokens';

export interface StagePill {
  key: string;
  label: string;
  color: string;
  count?: number;
}

export interface FilterField {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

const useStyles = createStyles(({ css, responsive }) => ({
  stages: css`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 12px;
    ${responsive.md} {
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-bottom: 4px;
    }
  `,
  pill: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    height: 30px;
    border-radius: ${radius.r16}px;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    white-space: nowrap;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text};
    font-weight: ${font.weight.semibold};
    font-family: inherit;
    flex-shrink: 0;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  pillOn: css`
    font-weight: ${font.weight.bold};
  `,
  dot: css`
    width: 7px;
    height: 7px;
    border-radius: ${radius.r4}px;
  `,
  cnt: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 6px;
    border-radius: ${radius.r8}px;
    background: ${color.divider};
    color: ${color.text3};
  `,
  spacer: css`
    flex: 1;
  `,
  seg: css`
    display: flex;
    padding: 2px;
    background: ${color.divider};
    border-radius: ${radius.r6}px;
    gap: 2px;
    flex-shrink: 0;
  `,
  segBtn: css`
    height: 36px;
    padding: 0 12px;
    border: none;
    border-radius: ${radius.r6}px;
    cursor: pointer;
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    font-family: inherit;
    background: transparent;
    color: ${color.text3};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  segOn: css`
    background: ${color.surface};
    color: ${color.text};
    box-shadow: ${shadow.segOn};
  `,
  select: css`
    min-height: 36px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    background: ${color.surface};
    color: ${color.text};
    padding: 0 8px;
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
      flex: 1;
    }
  `,
  strong: css`
    font-weight: ${font.weight.semibold};
  `,
  rel: css`
    position: relative;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    padding: 6px 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    &:hover {
      background: ${color.brandBg};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  btnOn: css`
    border-color: ${color.brand};
    color: ${color.brandInk};
  `,
  veil: css`
    position: fixed;
    inset: 0;
    z-index: 40;
  `,
  pop: css`
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    z-index: 41;
    width: 260px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.filterPop};
    padding: 12px;
    ${responsive.md} {
      position: fixed;
      left: 12px;
      right: 12px;
      top: 25%;
      width: auto;
    }
  `,
  popTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    margin-bottom: 8px;
    color: ${color.text};
  `,
  field: css`
    margin-bottom: 8px;
  `,
  label: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 4px;
  `,
  full: css`
    width: 100%;
  `,
  actions: css`
    display: flex;
    gap: 8px;
    margin-top: 12px;
  `,
  act: css`
    flex: 1;
    justify-content: center;
    min-height: 36px;
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s14}px;
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  clear: css`
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  apply: css`
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
  `,
}));

export interface StageTabsProps {
  stages: StagePill[];
  value: string;
  onChange: (key: string) => void;
  views?: { key: string; label: string; icon: IconName }[];
  view?: string;
  onView?: (key: string) => void;
}

export function StageTabs({ stages, value, onChange, views, view, onView }: StageTabsProps) {
  const { styles, cx } = useStyles();
  return (
    <div className={styles.stages} role="tablist" data-testid="stage-tabs">
      {stages.map((s) => {
        const on = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={on}
            className={cx(styles.pill, on && styles.pillOn)}
            // màu theo giai đoạn (dữ liệu) — giá trị động; alpha 0x14 / 0x22 như prototype
            style={on ? { borderColor: s.color, background: `${s.color}14`, color: s.color } : undefined}
            onClick={() => onChange(s.key)}
          >
            <span className={styles.dot} style={{ background: s.color }} />
            {s.label}
            {s.count !== undefined ? (
              <span className={styles.cnt} style={on ? { background: `${s.color}22`, color: s.color } : undefined}>
                {s.count}
              </span>
            ) : null}
          </button>
        );
      })}
      <span className={styles.spacer} />
      {views ? (
        <div className={styles.seg} role="radiogroup">
          {views.map((v) => (
            <button key={v.key} type="button" role="radio" aria-checked={view === v.key} className={cx(styles.segBtn, view === v.key && styles.segOn)} onClick={() => onView?.(v.key)}>
              <Icon name={v.icon} size={12} strokeWidth={1.9} />
              {v.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface FilterSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  strong?: boolean;
}

/** Select gọn của hàng lọc (prototype dùng select gốc 30px). */
export function FilterSelect({ value, onChange, options, label, strong }: FilterSelectProps) {
  const { styles, cx } = useStyles();
  return (
    <select aria-label={label} className={cx(styles.select, strong && styles.strong)} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export interface FilterPopoverProps {
  buttonLabel: string;
  title: string;
  fields: FilterField[];
  value: Record<string, string>;
  onApply: (v: Record<string, string>) => void;
  clearLabel: string;
  applyLabel: string;
  extra?: ReactNode;
}

/** Nút "Lọc" + popover 260px các trường nâng cao; chỉ áp dụng khi bấm "Áp dụng". */
export function FilterPopover({ buttonLabel, title, fields, value, onApply, clearLabel, applyLabel }: FilterPopoverProps) {
  const { styles, cx } = useStyles();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const toggle = () => {
    setDraft(value);
    setOpen((o) => !o);
  };
  const done = (v: Record<string, string>) => {
    onApply(v);
    setOpen(false);
  };
  return (
    <div className={styles.rel}>
      <button type="button" className={cx(styles.btn, open && styles.btnOn)} onClick={toggle} aria-expanded={open} data-testid="filter-btn">
        <Icon name="ic-filter" size={13} color={color.text3} />
        {buttonLabel}
      </button>
      {open ? (
        <>
          <div className={styles.veil} onClick={() => setOpen(false)} />
          <div className={styles.pop} data-testid="filter-pop">
            <div className={styles.popTitle}>{title}</div>
            {fields.map((f) => (
              <div key={f.key} className={styles.field}>
                <div className={styles.label}>{f.label}</div>
                <select aria-label={f.label} className={cx(styles.select, styles.full)} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className={styles.actions}>
              <button type="button" className={cx(styles.act, styles.clear)} onClick={() => done(Object.fromEntries(fields.map((f) => [f.key, ''])))}>
                {clearLabel}
              </button>
              <button type="button" className={cx(styles.act, styles.apply)} onClick={() => done(draft)}>
                {applyLabel}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
