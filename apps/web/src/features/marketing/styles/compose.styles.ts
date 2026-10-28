// Bước 3–4 wizard — prototype L3754–3780: thẻ AI soạn (3 giọng), trình soạn có thanh công cụ, 3 lựa chọn lịch gửi + tóm tắt chiến dịch.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';


export const useComposeStyles = createStyles(({ css, responsive }) => ({
  aiCard: css`
    border: 1px solid ${color.tipLine};
    border-radius: ${radius.r12}px;
    background: linear-gradient(135deg, ${color.tipBg}, ${color.white});
    padding: 12px 16px;
    margin-bottom: 12px;
  `,
  aiH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  aiIc: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r8}px;
    background: ${color.violetInk};
    display: grid;
    place-items: center;
  `,
  aiS: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.medium};
    color: ${color.text3};
  `,
  tones: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `,
  tone: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    border: 1px solid;
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  editor: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    overflow: hidden;
  `,
  bar: css`
    display: flex;
    gap: 2px;
    padding: 4px 6px;
    border-bottom: 1px solid ${color.pillBg};
    background: ${color.tabIdle};
    align-items: center;
  `,
  tool: css`
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: ${radius.r6}px;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    font-family: inherit;
  `,
  help: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: none;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.violetInk};
    cursor: pointer;
    font-family: inherit;
  `,
  text: css`
    width: 100%;
    min-height: 120px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.65;
    color: ${color.text};
    border: none;
    outline: none;
    resize: vertical;
    font-family: inherit;
    box-sizing: border-box;
    display: block;
  `,
  preview: css`
    margin-top: 12px;
    padding: 8px 12px;
    background: ${color.mkInfoSoft};
    border-radius: ${radius.r10}px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
  `,
  opts: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  `,
  opt: css`
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    background: ${color.surface};
    text-align: left;
    font-family: inherit;
    flex-wrap: wrap;
  `,
  optOn: css`
    border: 2px solid ${color.brand};
    background: ${color.mkBrandSoft};
  `,
  optIc: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  optT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  optS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  rec: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    background: ${color.violetChip};
    color: ${color.violetInk};
  `,
  at: css`
    height: 36px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 8px;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
  `,
  summary: css`
    padding: 12px 16px;
    background: ${color.bg};
    border: 1px solid ${color.divider};
    border-radius: ${radius.r12}px;
  `,
  sumT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 8px;
  `,
  sumG: css`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    span {
      color: ${color.text4};
    }
    div div {
      font-weight: ${font.weight.bold};
      color: ${color.text};
    }
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
}));
