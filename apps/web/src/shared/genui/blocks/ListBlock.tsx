// Khối `list`: mục chữ do model viết (diễn giải) hoặc dữ liệu từ `$ref` (title_key / subtitle_key). Compact 5 mục + "Mở rộng"; `open` →
// UiCommand open theo id của mục.
'use client';
import { GENUI_COMPACT, GENUI_LIMITS } from '@appchat/shared';
import { useGenUi } from '../context';
import { rowsOf } from '../format';
import { useGenUiStyles } from '../genui.styles';
import { isUnavailable, type BlockOf, type BlockProps } from '../types';
import { ExpandMore } from './ExpandMore';
import { NoData } from './NoData';

interface Item {
  title: string;
  sub?: string;
  id?: string;
}

/** Mục bấm được → UiCommand open (bàn phím: Enter). */
const clickable = (open: (id: string) => void, id: string) => ({
  tabIndex: 0,
  role: 'button' as const,
  onClick: () => open(id),
  onKeyDown: (e: { key: string }) => e.key === 'Enter' && open(id),
});

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : undefined);

export function ListBlock({ block }: BlockProps<BlockOf<'list'>>) {
  const { styles } = useGenUiStyles();
  const { ref, mode, onUi } = useGenUi();
  let items: Item[];
  if (Array.isArray(block.items)) items = block.items.map((title) => ({ title }));
  else {
    const v = ref(block.items);
    if (isUnavailable(v)) return <NoData />;
    items = Array.isArray(v) && v.every((x) => typeof x === 'string')
      ? (v as string[]).map((title) => ({ title }))
      : rowsOf(v).map((r) => ({ title: str(r[block.title_key ?? 'name']) ?? '—', sub: block.subtitle_key ? str(r[block.subtitle_key]) : undefined, id: block.open ? str(r[block.open.id_key]) : undefined }));
  }
  if (!items.length) return <NoData />;
  const shown = items.slice(0, mode === 'compact' ? GENUI_COMPACT.rows : GENUI_LIMITS.listItems);
  const open = block.open;
  const openItem = (id: string) => open && onUi({ type: 'open', entity: open.entity, id });
  return (
    <>
      <ul className={styles.list} data-testid="genui-list">
        {shown.map((it, i) => (
          <li
            key={i}
            {...(open && it.id ? { ...clickable(openItem, it.id), className: styles.clickItem } : {})}
          >
            <div className={styles.listTitle}>{it.title}</div>
            {it.sub ? <div className={styles.listSub}>{it.sub}</div> : null}
          </li>
        ))}
      </ul>
      <ExpandMore hidden={items.length - shown.length} />
    </>
  );
}
