// Mục Tổng quan — prototype L5824–5858: lưới 3 thẻ workspace, thẻ logo 80px gradient, form "Thông tin chung" (nhãn 200px), vùng nguy hiểm.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useGeneralStyles = createStyles(({ css, responsive }) => ({
  wsGrid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  ws: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
    background: ${color.surface};
  `,
  wsOn: css`
    && {
      border-color: ${color.brand};
      background: ${color.brandBg};
    }
    button {
      background: transparent;
    }
  `,
  wsHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  wsAv: css`
    width: 38px;
    height: 38px;
    border-radius: ${radius.r10}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s16}px;
    flex-shrink: 0;
  `,
  wsName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  wsId: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  pills: css`
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
    span {
      font-size: ${font.scale.s10}px;
      font-weight: ${font.weight.semibold};
      background: ${color.divider};
      color: ${color.text3};
      border-radius: ${radius.r4}px;
      padding: 2px 8px;
    }
  `,
  wsBtn: css`
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: ${layout.chip}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  logoRow: css`
    display: flex;
    gap: 20px;
    align-items: center;
    ${responsive.md} {
      gap: 12px;
    }
  `,
  logo: css`
    width: 80px;
    height: 80px;
    border-radius: ${radius.r20}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    color: ${color.white};
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s28}px;
    flex-shrink: 0;
    ${responsive.md} {
      width: 56px;
      height: 56px;
      font-size: ${font.scale.s20}px;
    }
  `,
  wsTitle: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  code: css`
    background: ${color.divider};
    padding: 2px 6px;
    border-radius: ${radius.r4}px;
    font-size: ${font.scale.s12}px;
    font-family: ${font.mono};
  `,
  form: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 0 20px;
    margin-bottom: 16px;
    ${responsive.md} {
      padding: 0 12px;
    }
  `,
  formT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    padding: 16px 0 6px;
  `,
  formS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  fRow: css`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    border-top: 1px solid ${color.divider};
    ${responsive.md} {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
    }
  `,
  fLabel: css`
    width: 200px;
    flex-shrink: 0;
    ${responsive.md} {
      width: auto;
    }
  `,
  fL: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  fH: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  fFoot: css`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 16px 0;
    border-top: 1px solid ${color.divider};
    ${responsive.md} {
      && button {
        min-height: ${layout.touch}px;
      }
    }
  `,
  dzT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 4px;
  `,
  dz: css`
    background: ${color.dangerSoftBg};
    border: 1px solid ${color.dangerBg};
    border-radius: ${radius.r12}px;
    padding: 4px 20px;
    ${responsive.md} {
      padding: 4px 12px;
    }
  `,
  dzRow: css`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.dangerSoftBorder};
    &:last-of-type {
      border-bottom: none;
    }
  `,
  dzL: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  dzRed: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.semibold};
    color: ${color.dangerStrong};
  `,
}));
