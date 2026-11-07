// Style màn /admin (TIP-040) — chỉ token (thang 4px), không prototype (PD-022).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useAdminStyles = createStyles(({ css }) => ({
  page: css`
    min-height: 100vh;
    background: ${color.bg};
    padding: 24px;
  `,
  title: css`
    &.ant-typography {
      font-size: ${font.scale.s20}px;
      font-weight: ${font.weight.bold};
      margin-bottom: 16px;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
  `,
  bar: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
  `,
  grow: css`
    flex: 1;
  `,
  muted: css`
    color: ${color.text3};
    font-size: ${font.scale.s12}px;
  `,
  pager: css`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    align-items: center;
    margin-top: 12px;
  `,
  group: css`
    margin-bottom: 16px;
  `,
}));
