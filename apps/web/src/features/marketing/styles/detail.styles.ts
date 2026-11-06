// Trang chi tiết chiến dịch (toàn màn) — prototype L3797–3866: đầu (← · kênh · tên · trạng thái · Xuất · Gửi lại), 3 tab, 5 thẻ số,
// hàng lọc + pill trạng thái, bảng người nhận (32 1.5fr 1.1fr .9fr 1.1fr 1.1fr 1.1fr 64), nội dung, lịch sử.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, z } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border-radius: ${radius.r8}px;
  padding: 0 12px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
`;

export const useDetailStyles = createStyles(({ css, responsive }) => ({
  page: css`
    position: fixed;
    inset: 0;
    z-index: ${z.mkPage};
    background: ${color.surface};
    display: flex;
    flex-direction: column;
    font-family: ${font.family};
    line-height: normal;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    border-bottom: 1px solid ${color.border};
    flex-shrink: 0;
    ${responsive.md} {
      padding: 8px 12px;
      flex-wrap: wrap;
    }
  `,
  back: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    font-size: ${font.scale.s20}px;
    border: none;
    background: none;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  chIc: css`
    width: 22px;
    height: 22px;
    border-radius: ${radius.r6}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  chIcSm: css`
    width: 18px;
    height: 18px;
    border-radius: ${radius.r4}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
  `,
  end: css`
    text-align: right;
  `,
  min0: css`
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    ${clip}
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  grow: css`
    flex: 1;
  `,
  ghost: css`
    ${btn}
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  reason: css`
    height: 36px;
    min-width: 0;
    width: 220px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text};
    font-size: ${font.scale.s13}px;
    outline: none;
    ${responsive.md} {
      width: 100%;
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    ${btn}
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  danger: css`
    ${btn}
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-weight: ${font.weight.bold};
    color: ${color.dangerStrong};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  tabs: css`
    display: flex;
    gap: 20px;
    padding: 8px 24px 0;
    border-bottom: 1px solid ${color.divider};
    flex-shrink: 0;
    overflow-x: auto;
    ${responsive.md} {
      padding: 0 12px;
    }
  `,
  tab: css`
    padding: 8px 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    white-space: nowrap;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  tabOn: css`
    font-weight: ${font.weight.bold};
    color: ${color.brand};
    border-bottom-color: ${color.brand};
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
    background: ${color.bg};
    ${responsive.md} {
      padding: 12px;
    }
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 16px;
    border: 1px solid ${color.noticeLine};
    background: ${color.noticeBg};
    border-radius: ${radius.r12}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.noticeText};
    flex-wrap: wrap;
  `,
  narrow: css`
    max-width: 640px;
  `,
  secT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 8px;
  `,
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
    background: ${color.surface};
  `,
  cardH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${color.tabIdle};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  cardN: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.regular};
  `,
  bubble: css`
    margin: 16px 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.65;
    color: ${color.text};
    background: ${color.mkPreview};
    border-radius: ${radius.r10}px;
    padding: 12px;
    white-space: pre-wrap;
  `,
  subj: css`
    margin: 12px 12px 0;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  ev: css`
    display: flex;
    gap: 12px;
  `,
  evRail: css`
    display: flex;
    flex-direction: column;
    align-items: center;
  `,
  evIc: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  evLine: css`
    width: 2px;
    flex: 1;
    background: ${color.divider};
    min-height: 18px;
  `,
  evBody: css`
    padding-bottom: 16px;
  `,
  evT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  evS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
}));
