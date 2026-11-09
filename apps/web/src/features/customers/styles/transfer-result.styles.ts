// Thẻ kết quả chuyển phụ trách (TIP-015d) — không có trong prototype; dựng bằng token theo khung modal D32 (collab.styles).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useTransferResultStyles = createStyles(({ css }) => ({
  box: css`
    margin-top: 12px;
    padding: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  stats: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  stat: css`
    font-size: ${font.scale.s13}px;
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
    b {
      font-weight: ${font.weight.heavy};
    }
  `,
  transferred: css`
    color: ${color.okText};
    background: ${color.brandBg};
  `,
  skipped: css`
    color: ${color.text3};
    background: ${color.fieldsBg};
  `,
  pending: css`
    color: ${color.amberText};
    background: ${color.amberBg};
  `,
  errors: css`
    color: ${color.dangerStrong};
    background: ${color.dangerSoftBg};
  `,
  errList: css`
    color: ${color.dangerStrong};
    margin: 0;
    padding-left: 20px;
    font-size: ${font.scale.s13}px;
  `,
  cancelled: css`
    color: ${color.text4};
    background: ${color.fieldsBg};
  `,
  moved: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  note: css`
    font-size: ${font.scale.s13}px;
    color: ${color.amberText};
  `,
}));
