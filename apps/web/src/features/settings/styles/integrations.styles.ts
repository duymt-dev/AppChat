// Mục Nền tảng kết nối — prototype L6220–6266: hero gradient xanh nhạt (22 / 14), pill nhóm, nút Kết nối gradient, nhãn "Sắp có",
// hộp kết nối 440 (padding 24, logo 52 nền xám, tiêu đề 20, input bo 10, nút cao 38 bo 10).
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow, z } from '@appchat/ui';

const mBtn = `
  display: inline-flex;
  align-items: center;
  height: 38px;
  border-radius: ${radius.r10}px;
  font-size: ${font.scale.s14}px;
  font-weight: ${font.weight.bold};
  cursor: pointer;
  font-family: inherit;
`;

export const useIntegStyles = createStyles(({ css, responsive }) => ({
  hero: css`
    background: linear-gradient(135deg, ${color.brandBg}, ${color.transparentWhite});
    border: 1px solid ${color.brandBorder};
    border-radius: ${radius.r12}px;
    padding: 20px 24px;
    margin-bottom: 16px;
    ${responsive.md} {
      padding: 16px;
    }
  `,
  heroT: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 4px;
  `,
  heroS: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    line-height: 1.5;
  `,
  cats: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-wrap: nowrap;
      overflow-x: auto;
    }
  `,
  cat: css`
    padding: 6px 12px;
    border-radius: ${radius.r16}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    white-space: nowrap;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  catOn: css`
    && {
      border-color: transparent;
      background: ${color.text};
      color: ${color.white};
    }
  `,
  click: css`
    cursor: pointer;
  `,
  bSoon: css`
    color: ${color.text3};
  `,
  connect: css`
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.white};
    background: ${gradient.brandSoft};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.modalVeil};
    z-index: ${z.mkModal};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    ${responsive.md} {
      padding: 0;
    }
  `,
  box: css`
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    width: 440px;
    max-width: 100%;
    padding: 24px;
    box-shadow: ${shadow.modal};
    font-family: ${font.family};
    line-height: normal;
    box-sizing: border-box;
    ${responsive.md} {
      width: 100%;
      height: 100%;
      border-radius: 0;
    }
  `,
  mHead: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  `,
  mLogo: css`
    width: 52px;
    height: 52px;
    border-radius: ${radius.r12}px;
    background: ${color.bg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  mT: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  mS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
  `,
  mDesc: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    line-height: 1.6;
    margin-bottom: 16px;
  `,
  mField: css`
    margin-bottom: 16px;
    input {
      width: 100%;
      height: 40px;
      border-radius: ${radius.r10}px;
    }
  `,
  mLabel: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    margin-bottom: 6px;
  `,
  mFoot: css`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  `,
  mCancel: css`
    ${mBtn}
    padding: 0 16px;
    border: 1px solid ${color.border};
    color: ${color.text2};
    background: ${color.surface};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  mGo: css`
    ${mBtn}
    padding: 0 20px;
    border: none;
    color: ${color.white};
    background: ${gradient.brandSoft};
    &:disabled {
      opacity: 0.6;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
