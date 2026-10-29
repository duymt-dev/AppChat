'use client';
import type { ReactNode } from 'react';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAuthStyles } from '../auth.styles';

export interface EmailFieldProps {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  icon?: IconName;
  type?: 'email' | 'password' | 'text';
  placeholder?: string;
  name?: string;
  autoComplete?: string;
  /** Nhãn phụ bên phải (vd "Quên mật khẩu?"). */
  aside?: ReactNode;
  /** Icon cách đỉnh 14px (form đăng nhập) thay vì 16px (đăng ký). */
  iconHigh?: boolean;
  testId?: string;
}

/** Ô nhập có icon trái — prototype L501 (email), L502 (mật khẩu). */
export function IconField({ label, value, onChange, icon = 'ic-mail', type = 'email', placeholder, name, autoComplete, aside, iconHigh, testId }: EmailFieldProps) {
  const { styles, cx } = useAuthStyles();
  return (
    <div className={styles.field}>
      <div className={styles.label}>
        <span>{label}</span>
        {aside}
      </div>
      <div className={cx(styles.inputWrap, iconHigh && styles.iconHigh)}>
        <Icon name={icon} size={16} color={color.text4} />
        <input
          className={cx(styles.input, type === 'password' && styles.inputPw)}
          data-testid={testId}
          type={type}
          name={name}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
