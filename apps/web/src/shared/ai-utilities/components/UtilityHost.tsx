// Host bền của form kỹ năng tiện ích (TIP-019c §4.2): gắn dưới ô soạn (Trợ lý / Hộp thư), NGOÀI popover — đóng popover không unmount form.
// Host giữ kỹ năng đang chọn + ngữ cảnh; đổi ngữ cảnh (hội thoại / khách) → đóng form, bỏ nguồn / kết quả cũ (không lộ sang ngữ cảnh mới).
'use client';
import { useEffect, useRef } from 'react';
import { useCan } from '../../authz/useCan';
import type { UtilityActionId, UtilityContext } from '../types';
import { UtilityForm } from './UtilityForm';

export function UtilityHost({ selected, ctx, onClose }: { selected: UtilityActionId | null; ctx: UtilityContext; onClose: () => void }) {
  const allowed = useCan('assistant.use');
  const key = `${ctx.conversationId ?? ''}|${ctx.contactId ?? ''}`;
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current !== key) {
      prev.current = key;
      onClose();
    }
  }, [key, onClose]);
  if (!selected || !allowed) return null;
  return <UtilityForm key={`${selected}|${key}`} actionId={selected} ctx={ctx} onClose={onClose} />;
}
