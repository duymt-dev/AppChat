// Hộp thoại Khách thân thiết (600 / 560px) — prototype L4492–4580, L4639–4664: đầu sticky, thanh 3 bước, ô nhập, thẻ thành viên / khách mới,
// khung điều chỉnh điểm, khung kết quả, chân sticky. Dùng chung cho Thêm thành viên · Cấu hình · Thử nghiệm tính điểm.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow, z } from '@appchat/ui';

const field = `
  height: 38px;
  width: 100%;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  background: ${color.surface};
  padding: 0 12px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  color: ${color.text};
  outline: none;
  box-sizing: border-box;
`;
const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
`;

export const useModalStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    z-index: ${z.stackedModal};
    background: ${color.drawerVeil};
    display: grid;
    place-items: center;
    padding: 24px;
    ${responsive.md} {
      padding: 0;
    }
  `,
  box: css`
    max-width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.crmModal};
    font-family: ${font.family};
    line-height: normal;
    display: flex;
    flex-direction: column;
    ${responsive.md} {
      width: 100vw !important;
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }
  `,
  w600: css`
    width: 600px;
  `,
  w560: css`
    width: 560px;
  `,
  head: css`
    padding: 16px 20px;
    border-bottom: 1px solid ${color.divider};
    display: flex;
    align-items: center;
    gap: 8px;
    position: sticky;
    top: 0;
    background: ${color.surface};
    z-index: 1;
  `,
  hT: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  hS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  x: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    flex-shrink: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  steps: css`
    padding: 8px 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  step: css`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  `,
  stepN: css`
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  stepL: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
    ${responsive.md} {
      display: none;
    }
  `,
  stepLine: css`
    flex: 1;
    height: 2px;
    border-radius: ${radius.r4}px;
  `,
  body: css`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  `,
  label: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 6px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  `,
  req: css`
    color: ${color.hotText};
  `,
  row: css`
    display: flex;
    gap: 8px;
  `,
  two: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  input: css`
    ${field}
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  select: css`
    ${field}
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  textarea: css`
    ${field}
    height: auto;
    min-height: 40px;
    padding: 8px 12px;
    resize: vertical;
  `,
  lookup: css`
    ${btn}
    height: 38px;
    padding: 0 16px;
    border: none;
    background: ${color.text};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 6px;
    b {
      color: ${color.text3};
    }
  `,
  found: css`
    background: ${color.brandBg};
    border: 1px solid ${color.brandEdge};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
  `,
  foundRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  av: css`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  fName: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  fSub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.brandInkDeep};
    margin-top: 2px;
  `,
  right: css`
    text-align: right;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    b {
      color: ${color.amberGold};
    }
  `,
  tier: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r12}px;
    display: inline-block;
    margin-bottom: 4px;
  `,
  next: css`
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${color.brandLine2};
    font-size: ${font.scale.s13}px;
    color: ${color.brandInkDeep};
  `,
  newBox: css`
    background: ${color.lyNewBg};
    border: 1px solid ${color.lyNewLine};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
  `,
  newT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.amberText};
    margin-bottom: 4px;
  `,
  newD: css`
    font-size: ${font.scale.s13}px;
    color: ${color.lyNewText};
    line-height: 1.55;
  `,
  panel: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-left: 3px solid ${color.brand};
    border-radius: ${radius.r12}px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  tagRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,
  tag: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    color: ${color.brandInk};
    background: ${color.brandBg};
    padding: 2px 8px;
    border-radius: ${radius.r6}px;
    text-transform: uppercase;
  `,
  muted: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    line-height: 1.5;
  `,
  res: css`
    background: ${color.lyRuleChip};
    border: 1px solid ${color.slateBg};
    border-radius: ${radius.r10}px;
    padding: 12px;
  `,
  resH: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    color: ${color.slateAvatar};
    margin-bottom: 8px;
    text-transform: uppercase;
  `,
  resRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    b {
      font-family: ${font.mono};
      font-weight: ${font.weight.heavy};
    }
  `,
  resTot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
    margin-top: 4px;
    border-top: 1px solid ${color.slateBg};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
    b {
      font-size: ${font.scale.s18}px;
      font-family: ${font.mono};
    }
  `,
  foot: css`
    padding: 12px 20px;
    border-top: 1px solid ${color.divider};
    display: flex;
    align-items: center;
    gap: 8px;
    position: sticky;
    bottom: 0;
    background: ${color.surface};
    flex-wrap: wrap;
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
  primary: css`
    ${btn}
    padding: 0 16px;
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    &:disabled {
      background: ${color.mkCheckLine};
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
