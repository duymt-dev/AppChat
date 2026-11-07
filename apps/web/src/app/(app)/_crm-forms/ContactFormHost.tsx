// Host toàn cục form sửa khách + chuyển phụ trách (TIP-025b §D.3) — mở từ bất kỳ đâu qua `useContactEditUi` (Hồ sơ 360° ở Hộp thư, Trợ
// lý), kể cả khi màn Khách hàng chưa mở / khách không có trong trang đang tải. Luôn đọc edit-context mới: trường ẩn không hiện / không gửi,
// gửi `if_version`; không sửa được (watcher / thiếu quyền) → không mở form ghi. Mất quyền thấy khách (404) → đóng. Đổi phụ trách đi
// qua luồng chuyển (crm.reassign), không qua contact.update.
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useContactEditUi } from '@/shared/crm-forms/contact-edit-command';
import { ContactFormModal, TransferOwnerModal, contactEditQuery, type EditTarget } from '@/features/customers';

export function ContactFormHost() {
  const target = useContactEditUi((s) => s.target);
  const { open, close } = useContactEditUi.getState();
  const q = useQuery({ ...contactEditQuery(target?.contactId ?? ''), enabled: !!target });
  const c = q.data;
  // Không còn thấy khách / lỗi đọc → đóng (không giữ form nhạy cảm mở).
  useEffect(() => {
    if (target && q.isError) close();
  }, [target, q.isError, close]);
  if (!target || !c || c.id !== target.contactId) return null;
  if (target.mode === 'transfer') {
    if (!c.can_transfer) return null;
    return <TransferOwnerModal key={`t-${c.id}`} contact={{ id: c.id, owner_user_id: c.owner_user_id, owner_name: c.owner_name }} toUserId={target.toUserId} onClose={close} />;
  }
  if (!c.editable) return null;
  const v = c.values;
  const row: EditTarget = {
    id: c.id,
    version: c.version,
    hidden: c.hidden_fields,
    owner_user_id: c.owner_user_id ?? '',
    custom: c.custom as EditTarget['custom'],
    ...Object.fromEntries(['full_name', 'title', 'email', 'phone', 'zalo', 'city', 'district'].filter((k) => k in v).map((k) => [k, v[k] ?? ''])),
  };
  return <ContactFormModal key={`e-${c.id}-${c.version}`} mode="edit" contact={row} onClose={close} onTransfer={c.can_transfer ? (to) => open(c.id, 'transfer', to) : undefined} />;
}
