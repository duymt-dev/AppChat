// EntityDrawer (Blueprint §7 primitive): drawer phải 392px cho chi tiết bản ghi — prototype L2723–2738 (header · tab · nội dung · chân).
// < md: placement="bottom", full chiều cao (frontend-structure §6).
'use client';
import type { ReactNode } from 'react';
import { Drawer, Grid } from 'antd';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import type { IconName } from '../icons/paths';
import { color, font, gradient, layout, radius, shadow } from '../tokens';

export interface DrawerTab {
  key: string;
  label: string;
}

export interface EntityDrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Ô icon đầu drawer (mặc định: gradient AI + ic-spark). */
  icon?: IconName;
  iconBg?: string;
  badge?: string;
  subtitle?: ReactNode;
  /** Header nền gradient (drawer Trợ lý). */
  tinted?: boolean;
  tabs?: DrawerTab[];
  /** Tab đệm ngang 12px (drawer chứng từ — prototype qDetail.tabs L9435). */
  wideTabs?: boolean;
  tab?: string;
  onTab?: (key: string) => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Thay khối đầu mặc định (drawer chi tiết sản phẩm / hợp đồng / đơn: icon lớn + chip + chỉ số) — nút đóng vẫn đặt góc phải. */
  header?: ReactNode;
  closeLabel: string;
  testId?: string;
  /** Nền vùng nội dung (360° dùng nền xám). */
  muted?: boolean;
}

const useStyles = createStyles(({ css }) => ({
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid ${color.border};
    flex-shrink: 0;
  `,
  headTinted: css`
    gap: 12px;
    padding: 16px;
    border-bottom-color: ${color.divider};
    background: ${gradient.aiSoft};
  `,
  icon: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  iconLg: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r10}px;
  `,
  title: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  titleLg: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.tealInk};
    font-weight: ${font.weight.semibold};
  `,
  badge: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.violetInk};
    background: ${color.violetBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  close: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    @media (max-width: 767px) {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  tabs: css`
    display: flex;
    border-bottom: 1px solid ${color.border};
    padding: 0 8px;
    gap: 2px;
    flex-shrink: 0;
    overflow-x: auto;
  `,
  tab: css`
    padding: 12px 8px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    white-space: nowrap;
    @media (max-width: 767px) {
      min-height: ${layout.touch}px;
    }
  `,
  tabWide: css`
    padding: 12px;
  `,
  tabOn: css`
    border-bottom-color: ${color.brand};
    color: ${color.brandInk};
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  `,
  muted: css`
    background: ${color.bg};
  `,
  headCustom: css`
    position: relative;
    background: ${color.surface};
    border-bottom: 1px solid ${color.border};
    padding: 16px 20px;
    flex-shrink: 0;
  `,
  closeAbs: css`
    position: absolute;
    top: 12px;
    right: 12px;
  `,
  tabsWhite: css`
    background: ${color.surface};
    padding: 0 16px;
  `,
  panel: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: ${font.family};
    line-height: normal;
  `,
}));

export function EntityDrawer(p: EntityDrawerProps) {
  const { styles, cx } = useStyles();
  const mobile = Grid.useBreakpoint().md === false;
  const tinted = !!p.tinted;
  return (
    <Drawer
      open={p.open}
      onClose={p.onClose}
      placement={mobile ? 'bottom' : 'right'}
      size={mobile ? '100%' : layout.crmDrawer}
      closable={false}
      destroyOnHidden
      // Modal chồng trên drawer (ModalShell stacked — duyệt & ký, gửi ký) cần nhận bàn phím: tắt bẫy focus của drawer.
      focusable={{ trap: false }}
      styles={{
        body: { padding: 0 },
        mask: { background: color.veil },
        wrapper: { boxShadow: shadow.sidePanel },
        section: tinted ? undefined : { borderLeft: `1px solid ${color.border}` },
      }}
    >
      <div className={styles.panel} data-testid={p.testId}>
        {p.header ? (
          <div className={styles.headCustom}>
            {p.header}
            <button
              type="button"
              className={cx(styles.close, styles.closeAbs)}
              onClick={p.onClose}
              aria-label={p.closeLabel}
            >
              <Icon name="ic-x" size={18} color={color.text3} />
            </button>
          </div>
        ) : (
          <div className={cx(styles.head, tinted && styles.headTinted)}>
            <span
              className={cx(styles.icon, tinted && styles.iconLg)}
              style={{ background: p.iconBg ?? gradient.aiAgent }}
            >
              <Icon
                name={p.icon ?? 'ic-spark'}
                size={tinted ? 17 : 13}
                color={color.white}
                strokeWidth={1.9}
              />
            </span>
            <div className={tinted ? styles.grow : undefined}>
              <span className={cx(styles.title, tinted && styles.titleLg)}>{p.title}</span>
              {p.subtitle ? <div className={styles.sub}>{p.subtitle}</div> : null}
            </div>
            {p.badge ? <span className={styles.badge}>{p.badge}</span> : null}
            {tinted ? null : <span className={styles.grow} />}
            <button type="button" className={styles.close} onClick={p.onClose} aria-label={p.closeLabel}>
              <Icon name="ic-x" size={18} color={color.text3} />
            </button>
          </div>
        )}
        {p.tabs ? (
          <div className={cx(styles.tabs, !!p.header && styles.tabsWhite)} role="tablist">
            {p.tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={p.tab === t.key}
                className={cx(styles.tab, p.wideTabs && styles.tabWide, p.tab === t.key && styles.tabOn)}
                onClick={() => p.onTab?.(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className={cx(styles.body, p.muted && styles.muted)}>{p.children}</div>
        {p.footer}
      </div>
    </Drawer>
  );
}
