// Kiểu chung của bảng kỹ năng tiện ích AI (TIP-019c §4.3) — chỉ token (packages/ui), dùng cho Trợ lý + Hộp thư.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useUtilityStyles = createStyles(({ css }) => ({
  panel: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 12px;
    margin-bottom: 8px;
    max-height: 420px;
    overflow-y: auto;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 8px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  label: css`
    display: block;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    margin: 8px 0 4px;
  `,
  seg: css`
    display: inline-flex;
    gap: 4px;
    flex-wrap: wrap;
  `,
  chip: css`
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.pill}px;
    padding: 4px 12px;
    font: inherit;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    cursor: pointer;
  `,
  chipOn: css`
    border-color: ${color.brandInk};
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
  `,
  input: css`
    width: 100%;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 8px;
    font: inherit;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    resize: vertical;
  `,
  msg: css`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 4px 0;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  row: css`
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
  `,
  btn: css`
    border: none;
    border-radius: ${radius.r8}px;
    padding: 8px 16px;
    font: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    background: ${color.brandInk};
    color: ${color.white};
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  ghost: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 8px 16px;
    font: inherit;
    font-size: ${font.scale.s13}px;
    background: ${color.surface};
    color: ${color.text2};
    cursor: pointer;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: none;
    background: none;
    padding: 8px;
    border-radius: ${radius.r8}px;
    font: inherit;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    text-align: left;
    cursor: pointer;
    &:hover {
      background: ${color.bg};
    }
  `,
  section: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text4};
    margin: 12px 0 4px;
  `,
  quote: css`
    border-left: 2px solid ${color.brand};
    padding-left: 8px;
    margin: 4px 0;
    font-style: italic;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  value: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  error: css`
    font-size: ${font.scale.s13}px;
    color: ${color.danger};
  `,
}));
