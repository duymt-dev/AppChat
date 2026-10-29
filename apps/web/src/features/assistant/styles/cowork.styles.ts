// Tác vụ tự chủ (Coworks) — trang, thẻ tác vụ, modal tạo, drawer cấu hình — prototype L1314–1424.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useCoworkStyles = createStyles(({ css, responsive }) => ({
  page: css`
    flex: 1;
    overflow-y: auto;
    /* prototype .appscroll ≤ 1440px: padding ngang 28 → 20 (L72) */
    padding: 24px 20px;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 8px 0;
  `,
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-left: 8px;
    ${responsive.md} {
      display: none;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  create: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    height: 36px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
    margin-bottom: 16px;
    min-width: 0;
  `,
  stat: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
  `,
  statHead: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
  `,
  statVal: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 12px;
    min-width: 0;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  task: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    cursor: pointer;
    text-align: left;
  `,
  taskHead: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  `,
  taskIcon: css`
    width: 40px;
    height: 40px;
    border-radius: ${radius.r10}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  taskName: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
  `,
  taskRole: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  st: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r12}px;
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  `,
  sw: css`
    width: 42px;
    height: 24px;
    border-radius: ${radius.r12}px;
    position: relative;
    flex-shrink: 0;
    cursor: pointer;
    border: none;
    padding: 0;
    /* < md: vùng chạm 44px, công tắc vẽ 44×28 (nền chỉ phủ content-box) */
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
      padding: 8px 0;
      background-clip: content-box;
      border-radius: ${radius.r12 * 2}px;
      & > span {
        top: 12px;
      }
    }
    & > span {
      position: absolute;
      top: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${color.white};
      box-shadow: ${shadow.knob};
      transition: left 0.15s;
    }
  `,
  tags: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  `,
  tag: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r6}px;
  `,
  chan: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    background: ${color.drawerBg};
    border: 1px solid ${color.tagLine};
    padding: 2px 8px;
    border-radius: ${radius.r6}px;
  `,
  metrics: css`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 8px;
    align-items: end;
    padding: 8px 0;
    border-top: 1px solid ${color.divider};
    border-bottom: 1px solid ${color.divider};
    margin-bottom: 8px;
  `,
  mLabel: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  mVal: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
  `,
  spark: css`
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 26px;
    & > span {
      width: 5px;
      border-radius: ${radius.r4}px;
      background: ${color.sparkBar};
    }
  `,
  conf: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  bar: css`
    flex: 1;
    height: 6px;
    border-radius: ${radius.r4}px;
    background: ${color.pillBg};
    overflow: hidden;
    & > span {
      display: block;
      height: 100%;
      background: ${gradient.confBar};
    }
  `,
  confLabel: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  composer: css`
    width: 100%;
    max-width: ${layout.composer}px;
    margin: 20px auto 0;
  `,
}));
