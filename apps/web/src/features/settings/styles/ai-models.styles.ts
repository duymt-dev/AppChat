// Mục AI Models — prototype L6881–6888: lưới thẻ 2 cột gap 12, thẻ bo 12 viền 1.5 (đang dùng: viền xanh nền xanh nhạt), icon 36 bo 10
// (đang dùng: gradient AI chữ trắng), tên 15 đậm + huy hiệu xanh 10, mô tả 13, giá mono 12, nút viền cao 36 toàn ngang.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useAiModelsStyles = createStyles(({ css, responsive }) => ({
  cards: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
  `,
  cardOn: css`
    && {
      background: ${color.brandBg};
      border-color: ${color.brand};
    }
  `,
  top: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
  `,
  ic: css`
    width: 36px;
    height: 36px;
    border-radius: ${radius.r10}px;
    background: ${color.divider};
    color: ${color.text3};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  icOn: css`
    && {
      background: ${gradient.ai};
      color: ${color.white};
    }
  `,
  nameRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  badge: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    background: ${color.aiTierBadge};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  desc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  price: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 6px;
    font-family: ${font.mono};
  `,
  btn: css`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    margin-top: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    background: transparent;
    color: ${color.text};
    cursor: pointer;
    &:disabled {
      cursor: default;
      border-color: ${color.brand};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  btnPrimary: css`
    && {
      color: ${color.brandInk};
    }
  `,
}));
