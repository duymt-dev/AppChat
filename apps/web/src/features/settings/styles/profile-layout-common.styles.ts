// Phần tử dùng chung giữa danh sách mẫu (Cài đặt) và hộp Tuỳ chỉnh bố cục — nút chính / phụ, select, chip.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useProfileLayoutCommonStyles = createStyles(({ css }) => ({
  select: css`
    height: 34px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    background: ${color.surface};
    color: ${color.text};
    cursor: pointer;
    max-width: 170px;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
  `,
  chipOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  ghostBtn: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  `,
  primaryBtn: css`
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      background: ${color.lySwitchOff};
      cursor: default;
    }
  `,
  mt8: css`
    margin-top: 8px;
  `,
  mt16: css`
    margin-top: 16px;
  `,
  gap8: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
}));
