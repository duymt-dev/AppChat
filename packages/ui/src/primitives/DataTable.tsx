// DataTable<T> (Blueprint §7 primitive): bọc antd Table — header in hoa 12px, dòng 14px, hover, chọn nhiều dòng.
// < md: thay bảng bằng danh sách thẻ `mobileCard` (frontend-structure §6). Không biết nghiệp vụ, không i18n — nhãn do màn truyền vào.
// ≥ md (D42): khung bảng lấp phần cao còn lại của màn (`ListPage`), chỉ thân bảng cuộn, header dính; `footer` (Pager) nằm đáy khung.
'use client';
import type { Key, ReactNode } from 'react';
import { ConfigProvider, Empty, Grid, Table, type TableColumnsType } from 'antd';
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '../tokens';
import { LIST_MIN_H } from './list-layout';

export type { TableColumnsType };

export interface DataTableProps<T> {
  rows: T[];
  columns: TableColumnsType<T>;
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Bề rộng tối thiểu trước khi cuộn ngang. */
  minWidth?: number;
  onRowClick?: (row: T) => void;
  selection?: { keys: Key[]; onChange: (keys: Key[]) => void };
  /** < md: render thẻ thay cho dòng. */
  mobileCard?: (row: T) => ReactNode;
  emptyText?: ReactNode;
  rowProps?: (row: T) => Record<string, string>;
  testId?: string;
  /** Footer trong khung bảng (Pager). */
  footer?: ReactNode;
}

const useStyles = createStyles(({ css, responsive }) => ({
  box: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.table};
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: ${LIST_MIN_H}px;
    ${responsive.md} {
      flex: none;
      min-height: 0;
    }
    .ant-table-thead > tr > th {
      position: sticky;
      top: 0;
      z-index: 2;
      font-size: ${font.scale.s12}px;
      line-height: normal;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-weight: ${font.weight.bold};
      border-bottom-color: ${color.divider};
    }
    .ant-table-thead > tr > th::before {
      display: none;
    }
    .ant-table-tbody > tr > td {
      border-bottom-color: ${color.dividerSoft};
      line-height: normal;
    }
    .ant-table-thead > tr > th:first-child,
    .ant-table-tbody > tr > td:first-child {
      padding-left: 16px;
    }
    .ant-table-thead > tr > th:last-child,
    .ant-table-tbody > tr > td:last-child {
      padding-right: 16px;
    }
  `,
  /** Vùng cuộn duy nhất của bảng (dọc + ngang) — header sticky bám vào đây. */
  scroll: css`
    flex: 1 1 0;
    min-height: 0;
    overflow: auto;
  `,
  check: css`
    margin: 0;
    accent-color: ${color.brand};
    vertical-align: middle;
  `,
  clickable: css`
    cursor: pointer;
  `,
  cards: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
    position: relative;
    cursor: pointer;
  `,
  empty: css`
    padding: 48px 16px;
  `,
  cardFoot: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
}));

const TABLE_THEME = {
  components: {
    Table: {
      headerBg: color.rowHover,
      headerColor: color.text3,
      rowHoverBg: color.rowHover,
      rowSelectedBg: color.brandBgSoft,
      rowSelectedHoverBg: color.brandBg,
      cellPaddingBlock: 12,
      cellPaddingInline: 4,
      cellFontSize: font.scale.s14,
      headerBorderRadius: 0,
      borderColor: color.dividerSoft,
      colorText: color.text,
    },
  },
} as const;

export function DataTable<T>({ rows, columns, rowKey, loading, minWidth, onRowClick, selection, mobileCard, emptyText, rowProps, testId, footer }: DataTableProps<T>) {
  const { styles, cx } = useStyles();
  const screens = Grid.useBreakpoint();
  const mobile = screens.md === false;
  const empty = (
    <div className={styles.empty} data-testid={testId ? `${testId}-empty` : undefined}>
      <Empty description={emptyText} />
    </div>
  );

  // cột chọn = checkbox gốc 30px như prototype (rowSelection của antd khác hình)
  const selectColumn: TableColumnsType<T>[number] = {
    key: '__select',
    width: 50,
    render: (_, r) => {
      const k = rowKey(r);
      const on = !!selection?.keys.includes(k);
      return (
        <input
          type="checkbox"
          className={styles.check}
          checked={on}
          aria-label={k}
          onClick={(e) => e.stopPropagation()}
          onChange={() => selection?.onChange(on ? selection.keys.filter((x) => x !== k) : [...selection.keys, k])}
        />
      );
    },
  };

  if (mobile && mobileCard) {
    return (
      <div className={styles.cards} data-testid={testId}>
        {rows.length
          ? rows.map((r) => (
              <div key={rowKey(r)} className={styles.card} onClick={() => onRowClick?.(r)} {...rowProps?.(r)}>
                {mobileCard(r)}
              </div>
            ))
          : empty}
        {footer ? <div className={styles.cardFoot}>{footer}</div> : null}
      </div>
    );
  }

  return (
    <div className={styles.box} data-testid={testId}>
      <div className={styles.scroll} data-testid={testId ? `${testId}-scroll` : undefined}>
        <ConfigProvider theme={TABLE_THEME}>
          <Table<T>
          rowKey={rowKey}
          dataSource={rows}
          loading={loading}
          pagination={false}
          tableLayout="fixed"
          style={minWidth ? { minWidth } : undefined}
          locale={{ emptyText: empty }}
          columns={selection ? [selectColumn, ...columns] : columns}
          rowClassName={() => cx(onRowClick && styles.clickable)}
          onRow={(r) => ({ onClick: () => onRowClick?.(r), ...rowProps?.(r) })}
          />
        </ConfigProvider>
      </div>
      {footer}
    </div>
  );
}
