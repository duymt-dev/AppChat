// Công tắc 36×20 (nhỏ 34×19) của Cài đặt — prototype L7197 / L7203: nền xanh khi bật, chấm trắng 16. Vùng chạm ≥ 44px trên mobile.
'use client';
import { useSwitchStyles } from '../styles/switch.styles';

interface Props {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  small?: boolean;
  disabled?: boolean;
  testId?: string;
}

export function Switch({ on, onChange, label, small, disabled, testId }: Props) {
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
      <span className={cx(styles.track, small && styles.small, on && styles.on)}>
        <span className={styles.dot} />
      </span>
    </button>
  );
}
