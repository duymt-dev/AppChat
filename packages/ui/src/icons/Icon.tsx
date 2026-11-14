// Icon từ sprite prototype (`#ic-*`), giữ nguyên path SVG để parity khớp từng pixel.
import type { CSSProperties } from 'react';
import { ICONS, type IconName } from './paths';

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, strokeWidth = 1.8, color = 'currentColor', className, style }: IconProps) {
  const def = ICONS[name];
  const isLogo = name.startsWith('lg-');
  return (
    <svg
      width={size}
      height={size}
      viewBox={def.viewBox}
      className={className}
      aria-hidden="true"
      style={{
        stroke: isLogo ? undefined : color,
        fill: 'none',
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        flexShrink: 0,
        display: 'block',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: def.body }}
    />
  );
}
