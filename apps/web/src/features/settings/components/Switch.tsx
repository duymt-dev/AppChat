// Công tắc 36×20 (nhỏ 34×19) của Cài đặt — prototype L7197 / L7203: nền xanh khi bật, chấm trắng 16. Vùng chạm ≥ 44px trên mobile.
'use client';
import { useSwitchStyles } from '../styles/switch.styles';

interface Props {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  small?: boolean;
  large?: boolean;
  /** 38×22 — bảng thông báo (prototype L6206). */
  mid?: boolean;
  disabled?: boolean;
  testId?: string;
}

export function Switch({ on, onChange, label, small, large, mid, disabled, testId }: Props) {
  const { styles, cx } = useSwitchStyles();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={cx(styles.hit)}
      onClick={() => onChange(!on)}
      data-testid={testId}
    >
      <span className={cx(styles.track, small && styles.small, large && styles.large, mid && styles.mid, on && styles.on)} data-on={on ? '1' : '0'}>
        <span className={styles.dot} />
      </span>
    </button>
  );
}
