// Dải xem trước bản dịch / ảnh chụp màn hình phía trên ô soạn + dòng bản dịch dưới tin khách (TIP-025b §F). Prototype không có (loại M —
// D21): dựng bằng token.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useAssistStyles = createStyles(({ css }) => ({
  bar: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    margin-bottom: 6px;
    border-radius: ${radius.r8}px;
    background: ${color.infoBg};
    font-size: ${font.scale.s12}px;
    color: ${color.text2};
  `,
  body: css`
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 4px;
    white-space: pre-wrap;
    word-break: break-word;
  `,
  translated: css`
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  btn: css`
    flex-shrink: 0;
    padding: 4px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    font-size: ${font.scale.s12}px;
    font-family: inherit;
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `,
  primary: css`
    border-color: ${color.brand};
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.semibold};
  `,
  shot: css`
    display: block;
    max-width: 100%;
    max-height: 160px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.border};
  `,
  inXl: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.info};
  `,
  more: css`
    align-self: center;
    margin: 4px auto;
    padding: 4px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r20}px;
    background: ${color.surface};
    font-size: ${font.scale.s12}px;
    color: ${color.text2};
    font-family: inherit;
    cursor: pointer;
  `,
}));
