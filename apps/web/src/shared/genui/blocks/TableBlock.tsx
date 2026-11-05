// Khối `table`: dòng từ `$ref` (≤ 20), cột do model chọn (≤ 6), định dạng theo cột. Compact: 5 dòng × 3 cột đầu + "Mở rộng". Dòng bấm được
// = UiCommand `open` (entity + id lấy từ cột `id_key` của dòng) — không đổi dữ liệu. Bàn phím: Enter mở dòng.
'use client';
import { GENUI_COMPACT, GENUI_LIMITS } from '@appchat/shared';
import { useFmt } from '../../i18n/useFmt';
import { useGenUi } from '../context';
import { formatValue, rowsOf } from '../format';
import { useGenUiStyles } from '../genui.styles';
import { isUnavailable, type BlockOf, type BlockProps } from '../types';
import { ExpandMore } from './ExpandMore';
import { NoData } from './NoData';

const rowProps = (go: () => void) => ({ tabIndex: 0, role: 'button' as const, onClick: go, onKeyDown: (e: { key: string }) => e.key === 'Enter' && go() });

export function TableBlock({ block }: BlockProps<BlockOf<'table'>>) {
  const { styles, cx } = useGenUiStyles();
  const { ref, mode, onUi } = useGenUi();
  const fmt = useFmt();
  const v = ref(block.rows);
  const all = rowsOf(v);
  if (isUnavailable(v) || !all.length) return <NoData />;
  const compact = mode === 'compact';
  const cols = block.columns.slice(0, compact ? GENUI_COMPACT.columns : GENUI_LIMITS.tableColumns);
  const rows = all.slice(0, compact ? GENUI_COMPACT.rows : GENUI_LIMITS.tableRows);
  const hidden = all.length - rows.length + (block.columns.length - cols.length);
  const open = block.open;
  const openRow = (r: Record<string, unknown>) => {
    const id = open ? r[open.id_key] : undefined;
    if (open && (typeof id === 'string' || typeof id === 'number')) onUi({ type: 'open', entity: open.entity, id: String(id) });
  };
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="genui-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={cx(open && styles.clickRow)}
                {...(open ? rowProps(() => openRow(r)) : {})}
              >
                {cols.map((c) => (
                  <td key={c.key}>{formatValue(fmt, r[c.key], c.format)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ExpandMore hidden={hidden} />
    </>
  );
}
