// Khung Trợ lý gắn bản ghi (TIP-023g): dải "đang gắn" + chip ý định + ô việc + nút Gửi; đích bấm ≥ 44px ở mobile 390, không tràn ngang.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useRecordIntentStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  `,
  bound: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.violetSoft};
    font-size: ${font.scale.s12}px;
    color: ${color.text};
    overflow: hidden;
    & > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
  chips: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  chip: css`
    padding: 6px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    font: inherit;
    font-size: ${font.scale.s12}px;
    color: ${color.text};
    cursor: pointer;
    &[aria-pressed='true'] {
      border-color: ${color.violet};
      color: ${color.violet};
    }
    ${responsive.mobile} {
      min-height: ${layout.touch}px;
    }
  `,
  task: css`
    width: 100%;
    min-height: 64px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font: inherit;
    font-size: ${font.scale.s13}px;
    resize: vertical;
    box-sizing: border-box;
  `,
  row: css`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  `,
  send: css`
    padding: 6px 16px;
    border: 0;
    border-radius: ${radius.r8}px;
    background: ${color.text};
    color: ${color.white};
    font: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    &:disabled {
      background: ${color.disabled};
      cursor: not-allowed;
    }
    ${responsive.mobile} {
      min-height: ${layout.touch}px;
    }
  `,
  card: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    color: ${color.text};
  `,
  muted: css`
    color: ${color.text4};
    font-size: ${font.scale.s12}px;
  `,
}));
