// Popup Nâng cấp — prototype L985–1027: nền mờ, thẻ 980 bo 16 nền F9FAFB (đầu trắng 20/24 + segment + ✕ nền xám), thân 20/24 cuộn:
// băng dùng thử (ô số ngày 44, thanh 120×6), 4 thẻ gói lớn, bảng so sánh (mt 16). < md: toàn màn.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow, z } from '@appchat/ui';

export const useUpgradeStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    z-index: ${z.mkModal};
    background: ${color.overlay};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px;
    ${responsive.md} {
      padding: 0;
      align-items: stretch;
    }
  `,
  card: css`
    width: 980px;
    max-width: 100%;
    max-height: 88vh;
    background: ${color.bg};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.modal};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: ${font.family};
    ${responsive.md} {
      width: 100%;
      max-height: 100vh;
      height: 100vh;
      border-radius: 0;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 20px 24px;
    border-bottom: 1px solid ${color.border};
    background: ${color.surface};
    flex-shrink: 0;
    ${responsive.md} {
      flex-wrap: wrap;
      padding: 12px;
    }
  `,
  t: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  s: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  segWrap: css`
    margin-right: 8px;
    ${responsive.md} {
      order: 3;
      width: 100%;
    }
  `,
  x: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    background: ${color.pillBg};
    border: none;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  body: css`
    padding: 20px 24px;
    overflow-y: auto;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  trial: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: ${color.brandBg};
    border: 1px solid ${color.brandLine};
    border-radius: ${radius.r12}px;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  days: css`
    width: 44px;
    height: 44px;
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    border: 1.5px solid ${color.brandDash};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
    line-height: 1;
  `,
  trT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInkDeep};
  `,
  trS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.brandMuted};
    line-height: 1.5;
    margin-top: 2px;
  `,
  bar: css`
    height: 6px;
    width: 120px;
    border-radius: ${radius.r4}px;
    background: ${color.trialBar};
    overflow: hidden;
    flex-shrink: 0;
    span {
      display: block;
      height: 100%;
      background: ${color.brand};
      border-radius: ${radius.r4}px;
    }
  `,
  cmp: css`
    margin-top: 16px;
  `,
}));
