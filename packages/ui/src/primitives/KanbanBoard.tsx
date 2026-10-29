// KanbanBoard<T> (Blueprint §7 primitive): cột theo trạng thái / giai đoạn, thẻ do màn render — prototype L2549–2595.
// Kéo thả HTML5 → onMove (màn gọi action). < md: cột cuộn ngang theo snap.
'use client';
import { useState, type ReactNode } from 'react';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import { color, font, layout, radius } from '../tokens';

export interface KanbanColumn {
  key: string;
  label: string;
  color: string;
}

export interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: T[];
  itemKey: (item: T) => string;
  groupBy: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onMove?: (item: T, to: string) => void;
  /** Nhãn nút "Thêm thẻ" cuối cột (không truyền = ẩn). */
  addLabel?: string;
  onAdd?: (column: string) => void;
  testId?: string;
}

const useStyles = createStyles(({ css, responsive }) => ({
  board: css`
    display: flex;
    gap: 12px;
    padding: 16px;
    overflow-x: auto;
    min-height: 340px;
    align-items: flex-start;
    ${responsive.md} {
      padding: 0 0 8px;
      scroll-snap-type: x mandatory;
    }
  `,
  col: css`
    flex: none;
    width: ${layout.kanbanCol}px;
    background: ${color.kanbanCol};
    border: 1px solid ${color.divider};
    border-radius: ${radius.r12}px;
    padding: 8px;
    ${responsive.md} {
      width: 82vw;
      scroll-snap-align: start;
    }
  `,
  over: css`
    border-color: ${color.brand};
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  `,
  dot: css`
    width: 8px;
    height: 8px;
    border-radius: ${radius.r4}px;
  `,
  title: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  count: css`
    margin-left: auto;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    background: ${color.kanbanCount};
    border-radius: ${radius.r8}px;
    padding: 2px 6px;
  `,
  cards: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  add: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    border: 1px dashed ${color.dashLine};
    border-radius: ${radius.r10}px;
    cursor: pointer;
    color: ${color.text3};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    background: transparent;
    font-family: inherit;
    &:hover {
      background: ${color.rowHover};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
}));

export function KanbanBoard<T>({ columns, items, itemKey, groupBy, renderCard, onMove, addLabel, onAdd, testId }: KanbanBoardProps<T>) {
  const { styles, cx } = useStyles();
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className={styles.board} data-testid={testId}>
      {columns.map((col) => {
        const cards = items.filter((i) => groupBy(i) === col.key);
        return (
          <div
            key={col.key}
            className={cx(styles.col, over === col.key && styles.over)}
            data-column={col.key}
            onDragOver={(e) => {
              if (!onMove || !drag) return;
              e.preventDefault();
              setOver(col.key);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              const it = items.find((i) => itemKey(i) === drag);
              if (it && groupBy(it) !== col.key) onMove?.(it, col.key);
              setDrag(null);
              setOver(null);
            }}
          >
            <div className={styles.head}>
              <span className={styles.dot} style={{ background: col.color }} />
              <span className={styles.title}>{col.label}</span>
              <span className={styles.count}>{cards.length}</span>
            </div>
            <div className={styles.cards}>
              {cards.map((it) => (
                <div key={itemKey(it)} draggable={!!onMove} onDragStart={() => setDrag(itemKey(it))} onDragEnd={() => setDrag(null)}>
                  {renderCard(it)}
                </div>
              ))}
              {addLabel ? (
                <button type="button" className={styles.add} onClick={() => onAdd?.(col.key)}>
                  <Icon name="ic-plus" size={14} color={color.text3} strokeWidth={2} />
                  {addLabel}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
