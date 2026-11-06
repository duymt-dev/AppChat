// Trình sửa vai trò (TIP-042) — prototype chưa vẽ (PD-018): hộp FormModal rộng, nhãn nhân bản, ma trận quyền theo nhóm (ô tick 18),
// phạm vi dữ liệu 6 module (select), quyền riêng Chủ sở hữu mờ kèm khoá.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useRoleEditorStyles = createStyles(({ css, responsive }) => ({
  note: css`
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.tabIdle};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  warn: css`
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  scopes: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  scopeRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    > span {
      flex: 1;
    }
    > select {
      width: 140px;
    }
  `,
  group: css`
    padding: 8px 0 4px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.05em;
    color: ${color.text4};
    text-transform: uppercase;
  `,
  perms: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  perm: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    cursor: pointer;
    input {
      width: 18px;
      height: 18px;
      accent-color: ${color.brand};
      cursor: inherit;
    }
  `,
  locked: css`
    color: ${color.text4};
    cursor: not-allowed;
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
}));
