// Bộ chọn 4 kỹ năng tiện ích cho NGƯỜI dùng (TIP-019c §4.1–4.2): chỉ chọn rồi giao cho host — không chạy, không cấp quyền cho agent.
// Ẩn hoàn toàn khi người xem không có assistant.use (server vẫn kiểm quyền nguồn ở mỗi lần gọi).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { UTILITY_ACTIONS } from '@appchat/shared';
import { getAction } from '@appchat/actions';
import { useCan } from '../../authz/useCan';
import { UTILITY_ICONS } from '../commands';
import { useUtilityStyles } from '../styles';
import type { UtilityActionId } from '../types';

export function UtilityMenu({ onSelect, title }: { onSelect: (id: UtilityActionId) => void; title?: string }) {
  const tAll = useTranslations();
  const t = useTranslations('assistant.utility');
  const { styles } = useUtilityStyles();
  if (!useCan('assistant.use')) return null;
  return (
    <div data-testid="utility-menu" role="group" aria-label={title ?? t('menuTitle')}>
      <div className={styles.section}>{title ?? t('menuTitle')}</div>
      {UTILITY_ACTIONS.map((id) => (
        <button key={id} type="button" className={styles.item} data-testid={`utility-pick-${id}`} onClick={() => onSelect(id)}>
          <Icon name={UTILITY_ICONS[id]} size={15} color={color.violet} />
          <span className={styles.grow}>{tAll((getAction(id)?.title ?? id) as never)}</span>
          <span className={styles.hint}>{`/${id}`}</span>
        </button>
      ))}
    </div>
  );
}
