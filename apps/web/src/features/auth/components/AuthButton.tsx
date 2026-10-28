'use client';
import type { ReactNode } from 'react';
import { Icon, color } from '@appchat/ui';
import { useAuthStyles } from '../auth.styles';

export interface AuthButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Không có mũi tên + không đổ bóng (nút "Gửi link đặt lại", "Về đăng nhập"). */
  flat?: boolean;
  arrow?: boolean;
  testId?: string;
  type?: 'button' | 'submit';
}

/** Nút chính 48px của auth — prototype L483 / L510. */
export function AuthButton({ children, onClick, disabled, loading, flat, arrow = !flat, testId, type = 'button' }: AuthButtonProps) {
  const { styles, cx } = useAuthStyles();
  return (
    <button
      type={type}
      className={cx(styles.primary, flat && styles.primaryFlat)}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-testid={testId}
    >
      {children}
      {arrow ? <Icon name="ic-arrow" size={16} strokeWidth={2.2} color={color.white} /> : null}
    </button>
  );
}
