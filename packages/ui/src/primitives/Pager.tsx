// Pager (Blueprint §7 primitive): footer bảng "Hiển thị a–b / n · ‹ Trước 1 2 3 Sau › · 20 / trang" — prototype L5007, L3519–3532, L4443.
// Không i18n: nhãn do màn truyền vào. < md: chỉ Trước · trang hiện tại · Sau (vùng chạm 44px), ẩn chọn số dòng.
'use client';
import type { ReactNode } from 'react';
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '../tokens';

export const PAGE_SIZES = [20, 50, 100] as const;

export interface PagerProps {
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
  /** "Hiển thị <b>1–20</b> / 124 báo giá" — màn dựng sẵn (t.rich). */
  label: ReactNode;
  prev: string;
  next: string;
  /** Nhãn ô chọn: (n) => "20 / trang". */
  sizeLabel?: (n: number) => string;
  /** Nút phụ cạnh nhãn (ví dụ "Đối soát"). */
  extra?: ReactNode;
  testId?: string;
}

const useStyles = createStyles(({ css, responsive }) => ({
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid ${color.divider};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    flex-shrink: 0;
    b {
      color: ${color.text};
    }
    ${responsive.md} {
      padding: 8px 12px;
      flex-wrap: wrap;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    background: ${color.surface};
    color: ${color.text};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    font-family: inherit;
    cursor: pointer;
    &:disabled {
      color: ${color.text4};
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  num: css`
    min-width: 28px;
    height: 28px;
    padding: 0 4px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      display: none;
    }
  `,
  on: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
    cursor: default;
    ${responsive.md} {
      display: grid;
      min-width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  gap: css`
    color: ${color.text4};
    ${responsive.md} {
      display: none;
    }
  `,
  select: css`
    height: 30px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s13}px;
    font-family: inherit;
    background: ${color.surface};
    color: ${color.text};
    ${responsive.md} {
      display: none;
    }
  `,
}));

/** Số trang hiển thị: 1 … p-1 p p+1 … last (tối đa 7 ô). */
export function pageItems(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const mid = [page - 1, page, page + 1].filter((n) => n > 1 && n < pages);
  const out: (number | 'gap')[] = [1];
  if (mid[0]! > 2) out.push('gap');
  out.push(...mid);
  if (mid[mid.length - 1]! < pages - 1) out.push('gap');
  out.push(pages);
  return out;
}

export function Pager({ page, size, total, onPage, onSize, label, prev, next, sizeLabel, extra, testId = 'pager' }: PagerProps) {
  const { styles, cx } = useStyles();
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className={styles.foot} data-testid={testId}>
      <span>{label}</span>
      {extra}
      <span className={styles.grow} />
      <button type="button" className={styles.btn} disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid={`${testId}-prev`}>
        {prev}
      </button>
      {pageItems(page, pages).map((n, i) =>
        n === 'gap' ? (
          <span key={`g${i}`} className={styles.gap}>
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className={cx(styles.num, n === page && styles.on)}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => n !== page && onPage(n)}
            data-testid={`${testId}-page-${n}`}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" className={styles.btn} disabled={page >= pages} onClick={() => onPage(page + 1)} data-testid={`${testId}-next`}>
        {next}
      </button>
      {onSize && sizeLabel ? (
        <select className={styles.select} value={size} onChange={(e) => onSize(Number(e.target.value))} aria-label={sizeLabel(size)} data-testid={`${testId}-size`}>
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {sizeLabel(n)}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
