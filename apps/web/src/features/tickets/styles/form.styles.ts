// Form "Tạo ticket mới" (540px, lưới 2 cột) + hộp đóng ticket — prototype L3247–3274.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const input = `
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  background: ${color.surface};
  color: ${color.text};
`;

export const useTkFormStyles = createStyles(({ css, responsive }) => ({
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
    font-weight: ${font.weight.regular};
  `,
  body: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  label: css`
    display: block;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 4px;
  `,
  input: css`
    ${input}
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  select: css`
    ${input}
    padding: 0 8px;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  three: css`
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr 1fr;
      > :first-child {
        grid-column: 1 / -1;
      }
    }
  `,
  two: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  rt: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    overflow: hidden;
  `,
  rtBar: css`
    display: flex;
    gap: 2px;
    padding: 4px 6px;
    border-bottom: 1px solid ${color.mutedBg};
    background: ${color.tabIdle};
    button {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: ${radius.r6}px;
      cursor: pointer;
      font-size: ${font.scale.s14}px;
      color: ${color.text2};
      font-family: inherit;
    }
  `,
  rtArea: css`
    width: 100%;
    min-height: 72px;
    padding: 8px 12px;
    border: none;
    outline: none;
    resize: vertical;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    box-sizing: border-box;
    color: ${color.text};
  `,
  full: css`
    grid-column: 1 / -1;
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 4px;
  `,
  pkg: css`
    font-size: ${font.scale.s12}px;
    color: ${color.violet};
    font-weight: ${font.weight.semibold};
    margin-top: 4px;
  `,
  err: css`
    background: ${color.dangerSoftBg};
    color: ${color.hotText};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
  `,
}));
