// Mục Lịch hẹn (TIP-033b) — màn mới không có trong prototype (gap-filling §2): khung thẻ như Chính sách bán hàng (padding 20, gap 16),
// lưới 7 thứ (nhãn · mở / nghỉ · giờ), bảng nhân sự, trình sửa ca riêng ba trạng thái (theo giờ mở cửa / nghỉ / giờ riêng).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useBookingStyles = createStyles(({ css, responsive }) => ({
  stack: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  box: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    ${responsive.md} {
      padding: 12px;
    }
  `,
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  day: css`
    display: grid;
    grid-template-columns: 96px 140px 1fr;
    align-items: center;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  `,
  dayName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  times: css`
    display: flex;
    align-items: center;
    gap: 8px;
    input {
      max-width: 120px;
    }
  `,
  err: css`
    font-size: ${font.scale.s12}px;
    color: ${color.dangerStrong};
  `,
  three: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  check: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: ${layout.touch}px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
  `,
  foot: css`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  `,
  staffRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid ${color.divider};
  `,
  av: css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s13}px;
    flex-shrink: 0;
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  off: css`
    opacity: 0.55;
  `,
  empty: css`
    padding: 16px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
}));
