// Cột "Kiểm thử tác nhân AI" — prototype L2401–2416: tiêu đề + Đặt lại, tab Trò chuyện / Mô phỏng kênh, luồng tin, ô nhập.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useTestStyles = createStyles(({ css, responsive }) => ({
  head: css`
    padding: 16px 20px;
    border-bottom: 1px solid ${color.border};
  `,
  top: css`
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  `,
  title: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    flex: 1;
  `,
  reset: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: ${layout.chip}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    &:hover {
      background: ${color.brandBg};
      border-color: ${color.chipHoverLine};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  tabs: css`
    display: flex;
    gap: 16px;
  `,
  tab: css`
    padding: 0 0 8px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text4};
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
  `,
  simSelect: css`
    margin-top: 12px;
    width: 100%;
    height: 36px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    background: ${color.surface};
    color: ${color.text};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  tabOn: css`
    border-bottom-color: ${color.brand};
    color: ${color.brand};
    font-weight: ${font.weight.bold};
  `,
  thread: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    background: ${color.bg};
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  ai: css`
    display: flex;
    gap: 8px;
  `,
  face: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s16}px;
    flex-shrink: 0;
  `,
  aiBubble: css`
    max-width: 78%;
    background: ${color.surface};
    border: 1px solid ${color.divider};
    border-radius: ${radius.r4}px ${radius.r12}px ${radius.r12}px ${radius.r12}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    line-height: 1.5;
  `,
  me: css`
    align-self: flex-end;
    max-width: 78%;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r12}px ${radius.r12}px ${radius.r4}px ${radius.r12}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
  `,
  dry: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    text-align: center;
  `,
  foot: css`
    padding: 12px 16px;
    border-top: 1px solid ${color.border};
  `,
  box: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 6px 6px 6px 12px;
    input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: ${font.scale.s14}px;
      color: ${color.text};
      background: transparent;
    }
  `,
  send: css`
    width: 34px;
    height: 34px;
    border: none;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
}));
