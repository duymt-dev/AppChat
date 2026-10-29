// Công tắc Cài đặt — prototype L7197: 36×20 bo 12, chấm 16 trắng bóng nhẹ, top 2 / left 2 → 18. Nhỏ: 34×19, chấm 15.
import { createStyles } from 'antd-style';
import { color, layout, radius } from '@appchat/ui';

export const useSwitchStyles = createStyles(({ css, responsive }) => ({
  hit: css`
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
    ${responsive.md} {
      min-width: ${layout.touch}px;
      min-height: ${layout.touch}px;
    }
  `,
  track: css`
    display: block;
    width: 36px;
    height: 20px;
    border-radius: ${radius.r12}px;
    background: ${color.border};
    position: relative;
    transition: background 0.15s;
  `,
  small: css`
    && {
      width: 34px;
      height: 19px;
      border-radius: ${radius.r10}px;
    }
    span {
      width: 15px;
      height: 15px;
    }
  `,
  on: css`
    && {
      background: ${color.brand};
    }
    span {
      left: 18px;
    }
  `,
  dot: css`
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${color.white};
    box-shadow: 0 1px 2px ${color.switchShadow};
    transition: left 0.15s;
  `,
}));
