// Khung ký tay trên màn hình (chuột / ngón tay — pointer events) cho ký điện tử (COMMERCE §9 C1). Trả PNG data URL qua onChange; '' = chưa ký.
'use client';
import { useEffect, useRef } from 'react';
import { createStyles } from 'antd-style';
import { color, radius } from '@appchat/ui';

const HEIGHT = 140;

const useStyles = createStyles(({ css }) => ({
  pad: css`
    width: 100%;
    height: ${HEIGHT}px;
    border: 1px dashed ${color.checkLine};
    border-radius: ${radius.r10}px;
    background: ${color.rowHover};
    touch-action: none;
    cursor: crosshair;
    display: block;
  `,
}));

export interface SignaturePadProps {
  onChange: (png: string) => void;
  /** Đổi giá trị để xoá chữ ký (nút "Ký lại"). */
  resetKey?: number;
  label: string;
  testId?: string;
}

export function SignaturePad({ onChange, resetKey, label, testId }: SignaturePadProps) {
  const { styles } = useStyles();
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ratio = window.devicePixelRatio || 1;
    cv.width = cv.clientWidth * ratio;
    cv.height = HEIGHT * ratio;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color.text;
    inked.current = false;
    onChange('');
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const [x, y] = at(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const [x, y] = at(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    inked.current = true;
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    if (inked.current) onChange(e.currentTarget.toDataURL('image/png'));
  };

  return (
    <canvas
      ref={ref}
      className={styles.pad}
      aria-label={label}
      role="img"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
      data-testid={testId}
    />
  );
}
