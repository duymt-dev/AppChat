// Mặt avatar tròn (TIP-014b D — PD-016): ảnh đại diện (ảnh nhân viên đặt hoặc ảnh đồng bộ từ kênh, link ký của AppChat — không hotlink
// CDN nhà cung cấp) phủ kín vòng tròn; không có ảnh / ảnh lỗi → chữ cái đầu trên màu sinh theo id như prototype.
'use client';
import { useState, type ReactNode } from 'react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => ({
  img: css`
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
  `,
}));

export interface AvatarFaceProps {
  className: string;
  /** Màu nền sinh theo id — giá trị động. */
  background: string | undefined;
  src?: string;
  children: ReactNode;
}

export function AvatarFace({ className, background, src, children }: AvatarFaceProps) {
  const { styles } = useStyles();
  const [broken, setBroken] = useState<string | null>(null);
  const show = !!src && broken !== src;
  return (
    <div className={className} style={{ background }} data-avatar={show ? 'image' : 'initials'}>
      {/* eslint-disable-next-line @next/next/no-img-element -- link ký của API (không qua next/image loader) */}
      {show ? <img className={styles.img} src={src} alt="" loading="lazy" onError={() => setBroken(src)} /> : children}
    </div>
  );
}
