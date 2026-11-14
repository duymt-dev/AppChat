// 6 ô OTP — prototype L489–495 / L573–578 (54px, JetBrains Mono 24.2px; < md: 48px / 19px).
'use client';
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const useStyles = createStyles(({ css, responsive }) => ({
  row: css`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  `,
  cell: css`
    flex: 1;
    min-width: 0;
    height: 54px;
    text-align: center;
    font-size: ${font.size.otp}px;
    font-weight: ${font.weight.heavy};
    border-radius: ${radius.lg}px;
    border: 1.5px solid ${color.border};
    background: ${color.bg};
    color: ${color.text};
    outline: none;
    font-family: ${font.mono};
    &:focus {
      border-color: ${color.brand};
    }
    ${responsive.md} {
      height: 48px;
      font-size: ${font.scale.s18}px;
      border-radius: ${radius.md}px;
    }
  `,
}));

export interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function OtpInput({ value, onChange, className }: OtpInputProps) {
  const t = useTranslations('auth.otp');
  const { styles, cx } = useStyles();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  const set = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, 6));
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!d) return;
    e.preventDefault();
    onChange(d);
    refs.current[Math.min(d.length, 5)]?.focus();
  };

  return (
    <div className={cx(styles.row, className)} data-testid="otp-input">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={styles.cell}
          value={d}
          maxLength={1}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={t('digit', { n: i + 1 })}
          onChange={(e) => set(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={onKey(i)}
          onPaste={onPaste}
        />
      ))}
    </div>
  );
}
