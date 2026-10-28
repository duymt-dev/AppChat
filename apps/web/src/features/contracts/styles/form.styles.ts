// Modal "Tạo hợp đồng" (crmForm 720 — prototype L5189–5228, crmSpec.contracts L8407) + hộp Duyệt & ký / Gửi ký.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useContractFormStyles = createStyles(({ css, responsive }) => ({
  section: css`
    margin-bottom: 20px;
  `,
  sectionTitle: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  wide: css`
    grid-column: 1 / -1;
  `,
  field: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  label: css`
    display: block;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 4px;
  `,
  input: css`
    width: 100%;
    height: 38px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    background: ${color.surface};
    color: ${color.text};
    &:focus {
      border-color: ${color.brand};
    }
    &:disabled {
      background: ${color.rowHover};
      color: ${color.text3};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  select: css`
    padding: 0 8px;
    cursor: pointer;
  `,
  area: css`
    height: 76px;
    padding: 8px 12px;
    resize: none;
    line-height: 1.5;
  `,
  file: css`
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
  `,
  err: css`
    background: ${color.dangerSoftBg};
    border: 1px solid ${color.dangerLine};
    color: ${color.hotText};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
    margin-bottom: 12px;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-bottom: 16px;
  `,
  otpRow: css`
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
    input {
      flex: 1;
      letter-spacing: 0.3em;
      font-family: ${font.mono};
    }
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-bottom: 16px;
  `,
  sigHead: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    button {
      border: none;
      background: transparent;
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
      cursor: pointer;
      font-family: inherit;
      font-size: ${font.scale.s12}px;
    }
  `,
  legal: css`
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBg};
    font-size: ${font.scale.s12}px;
    color: ${color.brandMuted};
    line-height: 1.5;
  `,
  channels: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  channel: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    background: ${color.surface};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    min-height: ${layout.touch}px;
  `,
}));
