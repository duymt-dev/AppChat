// Nút ⚡ "Giao AI" (TIP-015b mục 5, PRO-customers-rowai): mở drawer Trợ lý của màn Khách hàng với khách đã chọn làm ngữ cảnh (id — server kiểm
// scope ở mỗi lượt) và câu đề xuất theo gợi ý của dòng điền sẵn ô hỏi. KHÔNG tự gửi, không tạo run / ghi gì cho tới khi người dùng bấm gửi;
// mọi ghi / gửi tiếp theo vẫn qua preview / xác nhận / policy của Trợ lý. Đóng drawer → bỏ câu đề xuất.
'use client';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useCrmUi } from '../crm-store';
import type { ContactRow } from '../types';

export function useAssignContactAi() {
  const t = useTranslations('customers.ai');
  const set = useCrmUi((s) => s.set);
  return useCallback(
    (c: ContactRow) => set({ modal: 'ai', target: c.id, aiDraft: t('assign', { name: c.full_name, code: c.code, hint: c.ai.hint }), menuFor: null, tagFor: null }),
    [set, t],
  );
}
