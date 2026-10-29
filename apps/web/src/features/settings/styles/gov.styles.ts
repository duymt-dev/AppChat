// Mục AI Governance — prototype L6992 / L7009: banner gradient vàng viền vàng (khiên 24), chip từ khoá xám bo 12 có ✕, ô "+ Thêm" viền.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useGovStyles = createStyles(({ css, responsive }) => ({
  hero: css`
    background: ${gradient.govHero};
    border: 1px solid ${color.govBorder};
    border-radius: ${radius.r12}px;
    padding: 16px;
    margin-bottom: 16px;
    display: flex;
    gap: 12px;
    svg {
      flex-shrink: 0;
    }
  `,
  heroT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  heroS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
    line-height: 1.5;
  `,
  gap: css`
    color: ${color.brand};
    font-weight: ${font.weight.semibold};
  `,
  kws: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  `,
  kw: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    background: ${color.border};
    border-radius: ${radius.r12}px;
    padding: 4px 8px;
    border: none;
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.chip}px;
    }
  `,
  kwAdd: css`
    display: inline-flex;
    align-items: center;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 0 12px;
    input {
      border: none;
      outline: none;
      background: transparent;
      font-size: ${font.scale.s13}px;
      font-weight: ${font.weight.semibold};
      font-family: inherit;
      color: ${color.text};
      width: 72px;
      &:focus {
        width: 140px;
      }
      &::placeholder {
        color: ${color.text};
      }
    }
    ${responsive.md} {
      min-height: ${layout.chip}px;
    }
  `,
}));
