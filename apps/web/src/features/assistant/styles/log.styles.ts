// Nhật ký hành động / Chờ duyệt — prototype L1465–1499: tiêu đề, thanh lọc, chip loại, bảng.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useLogStyles = createStyles(({ css, responsive }) => ({
  page: css`
    flex: 1;
    overflow-y: auto;
    /* prototype .appscroll ≤ 1440px: padding ngang 28 → 20 (L72) */
    padding: 24px 20px;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  title: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
  `,
  sub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
    margin-top: 2px;
    margin-bottom: 12px;
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  search: css`
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 340px;
    ${responsive.md} {
      max-width: none;
      min-width: 100%;
    }
  `,
  searchIcon: css`
    position: absolute;
    left: 12px;
    top: 12px;
  `,
  input: css`
    height: 40px;
    width: 100%;
    padding-left: 36px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s15}px;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  select: css`
    height: 40px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    background: ${color.surface};
    padding: 0 12px;
    cursor: pointer;
    color: ${color.text2};
    ${responsive.md} {
      height: ${layout.touch}px;
      flex: 1;
    }
  `,
  reset: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  grow: css`
    flex: 1;
    ${responsive.md} {
      display: none;
    }
  `,
  count: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
  pills: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  `,
  pill: css`
    padding: 6px 12px;
    border-radius: ${radius.r16}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  pillOn: css`
    font-weight: ${font.weight.bold};
    border-color: transparent;
    background: ${color.text};
    color: ${color.white};
  `,
  kind: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
  `,
  kindIcon: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  rowTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
  `,
  obj: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  time: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  badge: css`
    display: inline-flex;
    align-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
  `,
  undo: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  dash: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  right: css`
    display: flex;
    justify-content: flex-end;
  `,
  card: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  cardRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
}));
