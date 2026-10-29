// Chờ duyệt — thẻ yêu cầu duyệt (màn mới; dùng token + pattern thẻ của Trợ lý / Nhật ký).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useApprovalStyles = createStyles(({ css, responsive }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 880px;
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.table};
    padding: 16px;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  icon: css`
    width: 36px;
    height: 36px;
    border-radius: ${radius.r10}px;
    background: ${color.violetChip};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
  `,
  meta: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  risk: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    flex-shrink: 0;
  `,
  summary: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
    margin-top: 12px;
  `,
  reason: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    background: ${color.bg};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    margin-top: 8px;
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  `,
  noRight: css`
    font-size: ${font.scale.s13}px;
    color: ${color.amberText};
  `,
  reject: css`
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      cursor: not-allowed;
      color: ${color.text4};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  approve: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    border: none;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      background: ${color.disabled};
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  done: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
  `,
  empty: css`
    padding: 48px 0;
    text-align: center;
    color: ${color.text4};
    font-size: ${font.scale.s15}px;
  `,
}));
