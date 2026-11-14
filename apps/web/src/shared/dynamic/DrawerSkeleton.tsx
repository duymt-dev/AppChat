// Khung của drawer / modal tải lười (TIP-001b §3.1): skeleton khi chunk đang về và trạng thái lỗi của vùng — cố định cạnh phải, không đẩy
// lệch bố cục màn.
'use client';
import { createStyles } from 'antd-style';
import { color, layout, shadow, z } from '@appchat/ui';
import { PageStates } from '../states/PageStates';

export const useDrawerFrameStyles = createStyles(({ css, responsive }) => ({
  frame: css`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: ${layout.crmDrawer}px;
    max-width: 100vw;
    z-index: ${z.modal};
    padding: 24px;
    background: ${color.surface};
    box-shadow: ${shadow.sidePanel};
    ${responsive.md} {
      width: 100vw;
    }
  `,
}));

export function DrawerSkeleton() {
  const { styles } = useDrawerFrameStyles();
  return (
    <div className={styles.frame} data-testid="drawer-loading" aria-busy="true">
      <PageStates state="loading">{null}</PageStates>
    </div>
  );
}
