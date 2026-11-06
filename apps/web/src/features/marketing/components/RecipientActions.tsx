// Thao tác một người nhận (TIP-037): Xem khách (Hồ sơ 360° — `/customers?c=`), Mở hội thoại (Hộp thư — `/inbox?c=`, chỉ khi có hội thoại).
// Không còn nút trơ: mỗi mục là điều hướng thật; người xem không có quyền CRM thì server đã không trả dòng (scope).
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color, type ActionMenuItem } from '@appchat/ui';
import { useRecStyles } from '../styles/recipients.styles';
import type { Recipient } from '../types';

export function RecipientActions({ r }: { r: Recipient }) {
  const t = useTranslations('marketing.detail');
  const { styles } = useRecStyles();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const contact = () => router.push(`/customers?c=${r.contact_id}`);
  const items: ActionMenuItem[] = [
    { key: 'contact', label: t('openContact'), icon: 'ic-users', iconColor: color.sky, onClick: () => (setOpen(false), contact()) },
    ...(r.conversation_id
      ? [{ key: 'conv', label: t('openConv'), icon: 'ic-inbox' as const, iconColor: color.info, onClick: () => (setOpen(false), router.push(`/inbox?c=${r.conversation_id}`)) }]
      : []),
  ];
  return (
    <div className={styles.acts}>
      <button type="button" aria-label={t('view')} onClick={contact} data-testid={`mk-rec-view-${r.id}`}>
        <Icon name="ic-eye" size={14} color={color.text3} />
      </button>
      <ActionMenu open={open} onToggle={() => setOpen((v) => !v)} onClose={() => setOpen(false)} label={t('more')} variant="ghost" items={items} testId={`mk-rec-menu-${r.id}`} />
    </div>
  );
}
