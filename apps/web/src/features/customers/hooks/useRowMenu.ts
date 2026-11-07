// Mục menu ⋯ của một khách (bảng L2533–2544 · kanban L2563–2573) + D32: "Người phụ trách", "Chuyển phụ trách" (crm.reassign).
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { color, type ActionMenuItem } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useCrmUi } from '../crm-store';
import type { ContactRow } from '../types';

export function useRowMenu(variant: 'table' | 'kanban') {
  const t = useTranslations('customers.menu');
  const router = useRouter();
  const ui = useCrmUi();
  const del = useAction('contact.delete');
  const canEdit = useCan('crm.edit');
  const canDelete = useCan('crm.delete');
  const canReassign = useCan('crm.reassign');

  return (c: ContactRow): ActionMenuItem[] => {
    const items: (ActionMenuItem | false)[] = [
      { key: 'detail', label: t('detail'), icon: 'ic-eye', iconColor: color.sky, onClick: () => ui.set({ detail: c.id }) },
      canEdit && { key: 'edit', label: t('edit'), icon: 'ic-cog', iconColor: color.okStrong, onClick: () => ui.open('edit', c.id) },
      variant === 'table'
        ? { key: 'message', label: t('message'), icon: 'ic-inbox', iconColor: color.blueAvatar, onClick: () => router.push('/inbox') }
        : canEdit && { key: 'tag', label: t('tag'), icon: 'ic-tag', iconColor: color.amberGold, onClick: () => ui.set({ tagFor: c.id }) },
      { key: 'collab', label: t('collab'), icon: 'ic-users', iconColor: color.assignIcon, onClick: () => ui.open('collab', c.id) },
      canReassign && { key: 'transfer', label: t('transfer'), icon: 'ic-arrow', iconColor: color.violet, onClick: () => ui.open('transfer', c.id) },
      canDelete && { key: 'delete', label: t('delete'), icon: 'ic-trash', danger: true, divider: true, onClick: () => void del.run({ contact_id: c.id }) },
    ];
    return items.filter((x): x is ActionMenuItem => !!x);
  };
}
