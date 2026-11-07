// Popover của ô soạn (trả lời nhanh / đặt lịch / dịch) — prototype L1801–1868.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow, z } from '@appchat/ui';

export const usePopStyles = createStyles(({ css, responsive }) => ({
  pop: css`
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: calc(100% - 4px);
    z-index: ${z.popover};
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.composerPop};
    overflow: hidden;
  `,
  popNarrow: css`
    right: auto;
    width: 380px;
    max-width: calc(100% - 24px);
  `,
  popRight: css`
    left: auto;
    width: 330px;
    max-width: calc(100% - 24px);
  `,
  popHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  popHint: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.regular};
    color: ${color.text4};
  `,
  popBody: css`
    padding: 12px;
    max-height: 280px;
    overflow-y: auto;
  `,
  grid2: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  qr: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    cursor: pointer;
    background: ${color.surface};
    text-align: left;
    font-family: inherit;
    min-width: 0;
    &:hover {
      background: ${color.bg};
    }
  `,
  qrCmd: css`
    font-size: ${font.scale.s12}px;
    font-family: ${font.mono};
    font-weight: ${font.weight.bold};
    color: ${color.amberGold};
    margin-right: 6px;
  `,
  qrTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  qrPreview: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  `,
  slot: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r10}px;
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    text-align: left;
    margin-bottom: 6px;
  `,
  slotOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
  `,
  lang: css`
    padding: 6px 12px;
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r20}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
  `,
  langOn: css`
    border-color: ${color.blue};
    color: ${color.blue};
    background: ${color.infoBg};
  `,
  /** Ô chọn dịch vụ / ngày / nhân viên của popover đặt lịch (TIP-025b §E). */
  field: css`
    width: 100%;
    padding: 6px 12px;
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s13}px;
    font-family: inherit;
    background: ${color.surface};
    color: ${color.text};
    margin-bottom: 6px;
  `,
  builderLink: css`
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s13}px;
  `,
}));
