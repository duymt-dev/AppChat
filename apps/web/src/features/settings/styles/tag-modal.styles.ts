// Hộp thẻ — prototype L7528–7545: chip xem trước viền, ô emoji 46 (lưới 210 bóng), tên cao 44 bo 10 (viền đỏ khi lỗi),
// chấm màu 30 tròn (chọn: vòng trắng 2 + vòng màu 4), mô tả cao 90 bo 10, nhãn có chấm "i".
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useTagModalStyles = createStyles(({ css, responsive }) => ({
  preview: css`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
  `,
  top: css`
    display: flex;
    gap: 16px;
    align-items: flex-start;
  `,
  emoji: css`
    width: 46px;
    height: 46px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s24}px;
    cursor: pointer;
    background: ${color.surface};
    padding: 0;
  `,
  emojis: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    width: 210px;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    background: ${color.surface};
    box-shadow: ${shadow.popover};
  `,
  e: css`
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s20}px;
    cursor: pointer;
    border-radius: ${radius.r6}px;
    border: none;
    background: transparent;
    padding: 0;
    &:hover {
      background: ${color.divider};
    }
  `,
  name: css`
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s15}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    ${responsive.md} {
      font-size: ${font.scale.s16}px;
    }
  `,
  bad: css`
    && {
      border-color: ${color.dangerStrong};
    }
  `,
  err: css`
    font-size: ${font.scale.s13}px;
    color: ${color.dangerStrong};
    margin-top: 6px;
  `,
  colors: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  dot: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    display: grid;
    place-items: center;
    border: none;
    padding: 0;
    color: ${color.white};
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    ${responsive.md} {
      width: 36px;
      height: 36px;
    }
  `,
  dotOn: css`
    box-shadow:
      0 0 0 2px ${color.white},
      0 0 0 4px var(--ring);
  `,
  descL: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  info: css`
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: ${color.border};
    color: ${color.text3};
    font-size: ${font.scale.s11}px;
    display: grid;
    place-items: center;
  `,
  desc: css`
    width: 100%;
    min-height: 90px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    resize: vertical;
    ${responsive.md} {
      min-height: ${layout.touch * 2}px;
    }
  `,
}));
