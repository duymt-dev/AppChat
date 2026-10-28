// ModalShell: khung modal chung của các màn danh sách — prototype L2600–2722 (header icon 34 + tiêu đề 20 + ✕ · thân cuộn · chân nút).
// < md: full màn hình.
'use client';
import type { ReactNode } from 'react';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import type { IconName } from '../icons/paths';
import { color, font, radius, shadow } from '../tokens';

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon: IconName;
  iconColor: string;
  iconBg: string;
  width: number;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
  testId?: string;
  /** Thân không padding (bảng chiếm hết). */
  flush?: boolean;
  /** Form (prototype L2610): thân 20px, chân 16px 20px. */
  roomy?: boolean;
  /** Đầu modal kiểu form sản phẩm (prototype L4072): icon 38, tiêu đề 18, đệm dưới 12, chân nền xám. */
  dense?: boolean;
}

const useStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.dimVeil};
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    ${responsive.md} {
      padding: 0;
      z-index: 900;
    }
  `,
  box: css`
    max-width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.crmModal};
    overflow: hidden;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      width: 100vw !important;
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid ${color.divider};
  `,
  headDense: css`
    padding: 16px 20px 12px;
  `,
  iconDense: css`
    width: 38px;
    height: 38px;
  `,
  titleDense: css`
    font-size: ${font.scale.s18}px;
  `,
  footDense: css`
    background: ${color.bg};
  `,
  icon: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r10}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  title: css`
    flex: 1;
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  x: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    ${responsive.md} {
      width: 44px;
      height: 44px;
    }
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  `,
  flush: css`
    padding: 0;
  `,
  roomyBody: css`
    padding: 20px;
  `,
  roomyFoot: css`
    padding: 16px 20px;
  `,
  foot: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid ${color.divider};
  `,
}));

export function ModalShell(p: ModalShellProps) {
  const { styles, cx } = useStyles();
  if (!p.open) return null;
  return (
    <div className={styles.veil} onClick={p.onClose} data-testid={p.testId}>
      <div
        className={styles.box}
        style={{ width: p.width }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cx(styles.head, p.dense && styles.headDense)}>
          <span className={cx(styles.icon, p.dense && styles.iconDense)} style={{ background: p.iconBg }}>
            <Icon name={p.icon} size={p.dense ? 19 : 17} color={p.iconColor} />
          </span>
          <span className={cx(styles.title, p.dense && styles.titleDense)}>{p.title}</span>
          <button type="button" className={styles.x} onClick={p.onClose} aria-label={p.closeLabel}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <div className={cx(styles.body, p.flush && styles.flush, p.roomy && styles.roomyBody)}>
          {p.children}
        </div>
        {p.footer ? (
          <div className={cx(styles.foot, p.roomy && styles.roomyFoot, p.dense && styles.footDense)}>
            {p.footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
