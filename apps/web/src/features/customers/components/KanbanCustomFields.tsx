// Trường tuỳ biến trên thẻ Kanban (TIP-026b §4.4, custom-fields §4b): tối đa 2 trường `visible_in.kanban` mà vai trò người xem thấy, theo
// thứ tự định nghĩa (server trả theo sort). Chỉ hiện trường có giá trị trong `custom` đã chiếu theo quyền (045b) — không ghi 0 / nhãn rỗng
// thay cho trường ẩn; giá trị dùng formatter chung, React tự escape.
'use client';
import { useCustomFields, formatCustomValue } from '@/shared/custom-fields';
import { useFmt } from '@/shared/i18n/useFmt';
import type { CustomValues } from '@appchat/shared';
import { useKanbanCardStyles } from '../styles/kanban.styles';

const MAX = 2;

export function KanbanCustomFields({ custom }: { custom?: CustomValues }) {
  const defs = useCustomFields('contact', 'kanban');
  const fmt = useFmt();
  const { styles } = useKanbanCardStyles();
  const shown = defs
    .filter((f) => custom && Object.prototype.hasOwnProperty.call(custom, f.key) && custom[f.key] !== null && custom[f.key] !== '' && !(Array.isArray(custom[f.key]) && !(custom[f.key] as unknown[]).length))
    .slice(0, MAX);
  if (!shown.length) return null;
  return (
    <div className={styles.cf} data-testid="kanban-custom">
      {shown.map((f) => (
        <div key={f.key} className={styles.cfRow}>
          <span className={styles.cfLabel}>{f.label}</span>
          <span className={styles.cfValue}>{formatCustomValue(f, custom![f.key] ?? undefined, fmt)}</span>
        </div>
      ))}
    </div>
  );
}
