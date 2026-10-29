// ActionMenu: nút ⋯ + menu thao tác của một bản ghi (prototype L2532–2544 / L2562–2573). Dùng cho bảng, kanban, drawer.
'use client';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import type { IconName } from '../icons/paths';
import { color, font, layout, radius, shadow } from '../tokens';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: IconName;
  iconColor?: string;
  danger?: boolean;
  /** Vạch ngăn phía trên mục này. */
  divider?: boolean;
  onClick: () => void;
}

export interface ActionMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: ActionMenuItem[];
  label: string;
  variant?: 'boxed' | 'ghost';
  testId?: string;
}

const useStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    position: relative;
    flex-shrink: 0;
  `,
  dots: css`
    display: grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px !important;
      height: ${layout.touch}px !important;
    }
  `,
  boxed: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
  `,
  ghost: css`
    width: 24px;
    height: 24px;
    border-radius: ${radius.r6}px;
    border: none;
    background: transparent;
    color: ${color.text4};
    &:hover {
      background: ${color.divider};
      color: ${color.text2};
    }
  `,
  veil: css`
    position: fixed;
    inset: 0;
    z-index: 90;
  `,
  menu: css`
    position: absolute;
    right: 0;
    z-index: 91;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.rowMenu};
    padding: 4px;
    min-width: 184px;
    text-align: left;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px;
    border-radius: ${radius.r6}px;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    &:hover {
      background: ${color.rowHover};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  danger: css`
    font-weight: ${font.weight.semibold};
    color: ${color.dangerStrong};
  `,
  sep: css`
    height: 1px;
    background: ${color.divider};
    margin: 4px;
  `,
}));

export function ActionMenu({ open, onToggle, onClose, items, label, variant = 'boxed', testId }: ActionMenuProps) {
  const { styles, cx } = useStyles();
  const boxed = variant === 'boxed';
  return (
    <div className={styles.wrap} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={cx(styles.dots, boxed ? styles.boxed : styles.ghost, 'row-dots')} title={label} aria-label={label} aria-expanded={open} onClick={onToggle}>
        <svg width={boxed ? 15 : 14} height={boxed ? 15 : 14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open ? (
        <>
          <div className={styles.veil} onClick={onClose} />
          <div className={styles.menu} role="menu" data-testid={testId} style={{ top: boxed ? 32 : 28 }}>
            {items.map((it) => (
              <div key={it.key}>
                {it.divider ? <div className={styles.sep} /> : null}
                <button
                  type="button"
                  role="menuitem"
                  className={cx(styles.item, it.danger && styles.danger)}
                  onClick={() => {
                    onClose();
                    it.onClick();
                  }}
                >
                  <Icon name={it.icon} size={13} color={it.danger ? color.dangerStrong : (it.iconColor ?? color.text3)} />
                  {it.label}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
