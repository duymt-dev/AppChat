// Khối "AI ghi nhớ" + tóm tắt theo phạm vi (TIP-015b) — cùng thang thẻ Hồ sơ 360° (panel.styles của Hộp thư): thẻ 12px, nhãn 12px.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useMemoryStyles = createStyles(({ css }) => ({
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 12px;
    margin-bottom: 12px;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
  `,
  count: css`
    margin-left: auto;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  list: css`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  item: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
    color: ${color.text2};
  `,
  fact: css`
    flex: 1;
    min-width: 0;
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  forget: css`
    border: none;
    background: none;
    padding: 2px;
    cursor: pointer;
    color: ${color.text4};
    display: inline-grid;
    place-items: center;
    border-radius: ${radius.r6}px;
    &:hover {
      color: ${color.dangerStrong};
      background: ${color.dangerBg};
    }
    &:disabled {
      cursor: default;
      opacity: 0.5;
    }
  `,
  empty: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  link: css`
    margin-left: auto;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    padding: 0;
    &:disabled {
      color: ${color.text4};
      cursor: default;
    }
  `,
  source: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 6px;
  `,
}));
