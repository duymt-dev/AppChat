// Xem trước widget — prototype L7271–7298: panel xám pad 16, sân khấu cao 440 gradient, cửa sổ chat (top/left/right 16, bottom 84) bo 16,
// đầu gradient xanh (avatar 34 chồng -8, chip trực tuyến, "Xin chào! 👋" 18 đậm), thân nền xám nhạt, chân ô nhập; launcher 58 tròn.
import { createStyles } from 'antd-style';
import { color, font, gradient, radius, shadow } from '@appchat/ui';

const av = `
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: ${font.weight.heavy};
  font-size: ${font.scale.s14}px;
  border: 2px solid ${color.white};
`;

export const useWidgetPvStyles = createStyles(({ css }) => ({
  panel: css`
    background: ${color.wgPanel};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    align-self: start;
    min-width: 0;
  `,
  lbl: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 8px;
  `,
  stage: css`
    height: 440px;
    border-radius: ${radius.r12}px;
    background: ${gradient.wgPreview};
    border: 1px solid ${color.border};
    position: relative;
    overflow: hidden;
  `,
  win: css`
    position: absolute;
    inset: 16px 16px 84px 16px;
    background: ${color.white};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.wgPanel};
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `,
  head: css`
    background: ${gradient.wgHead};
    color: ${color.white};
    padding: 16px;
    flex-shrink: 0;
    position: relative;
  `,
  ctl: css`
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    gap: 4px;
    & > * {
      width: 24px;
      height: 24px;
      border-radius: ${radius.r6}px;
      display: grid;
      place-items: center;
      color: ${color.wgWhite85};
      font-size: ${font.scale.s15}px;
      font-weight: ${font.weight.bold};
      border: none;
      background: transparent;
      padding: 0;
      cursor: pointer;
      font-family: inherit;
    }
  `,
  avs: css`
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  `,
  av: css`
    ${av}
    background: ${color.white};
    box-shadow: ${shadow.wgAvatar};
  `,
  avOver: css`
    ${av}
    color: ${color.white};
    margin-left: -8px;
  `,
  online: css`
    margin-left: 8px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    background: ${color.wgWhite20};
    border-radius: ${radius.r10}px;
    padding: 2px 8px;
  `,
  onDot: css`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${color.wgOnline};
  `,
  hi: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.01em;
  `,
  hiS: css`
    font-size: ${font.scale.s13}px;
    opacity: 0.9;
    margin-top: 2px;
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: ${color.wgChatBg};
  `,
  msgRow: css`
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  `,
  aiAv: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${gradient.ai};
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  msgCol: css`
    max-width: 80%;
  `,
  msg: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    line-height: 1.5;
    background: ${color.white};
    padding: 8px 12px;
    border-radius: ${radius.r4}px ${radius.r12}px ${radius.r12}px ${radius.r12}px;
    box-shadow: ${shadow.wgMsg};
  `,
  meta: css`
    font-size: ${font.scale.s10}px;
    color: ${color.text4};
    margin: 2px 0 0 2px;
  `,
  acts: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  `,
  act: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    background: ${color.white};
    border: 1.5px solid;
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    box-shadow: ${shadow.wgMsg};
  `,
  foot: css`
    padding: 8px 12px;
    border-top: 1px solid ${color.wgFoot};
    flex-shrink: 0;
    background: ${color.white};
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  ph: css`
    flex: 1;
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  send: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  pow: css`
    text-align: center;
    font-size: ${font.scale.s10}px;
    color: ${color.wgPowered};
    margin-top: 6px;
    b {
      color: ${color.text4};
    }
  `,
  launcher: css`
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    border: none;
    background: ${color.brand};
    display: grid;
    place-items: center;
    box-shadow: ${shadow.wgLauncher};
    cursor: pointer;
  `,
}));
