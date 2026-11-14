// Thẻ duyệt trong Hộp thư (TIP-025b §G.2): yêu cầu duyệt do AI tạo trong hội thoại đang mở — dùng lại ApprovalCard của Trợ lý (cùng
// approval.approve / reject / edit_and_approve, cùng xác nhận + quyền duyệt action gốc). Đã duyệt nhưng thao tác chưa chạy hiện "Đã duyệt
// — đang chờ chạy" (không phải "đã gửi"). Mặc định chỉ hiện thẻ chờ duyệt; "Xem tất cả" mở cả đã xử lý. Ẩn hẳn khi không có thẻ.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApprovalCard } from '@/features/assistant';
import { conversationApprovalsQuery } from '../approval-api';
import { useAssistStyles } from '../styles/assist.styles';

export function InboxApprovals({ conversationId }: { conversationId: string }) {
  const t = useTranslations('inbox.approvals');
  const { styles } = useAssistStyles();
  const q = useQuery(conversationApprovalsQuery(conversationId));
  const [all, setAll] = useState(false);
  if (q.isError) return <div className={styles.bar} role="alert" data-testid="inbox-approvals-error">{t('error')}</div>;
  const items = q.data?.items ?? [];
  if (!items.length) return null;
  const shown = all ? items : items.filter((a) => a.status === 'pending');
  return (
    <section aria-label={t('title')} data-testid="inbox-approvals">
      <div className={styles.bar}>
        <div className={styles.body}>
          <b>{t('title')}</b>
          <span>{t('count', { pending: q.data?.pending ?? 0, total: items.length })}</span>
        </div>
        {items.length > shown.length || all ? (
          <button type="button" className={styles.btn} aria-expanded={all} onClick={() => setAll(!all)} data-testid="inbox-approvals-all">
            {all ? t('pendingOnly') : t('all')}
          </button>
        ) : null}
      </div>
      {shown.map((a) => (
        <div key={a.id}>
          <ApprovalCard a={a} />
          {(a.status === 'approved' || a.status === 'edited') && a.executed === false ? (
            <div className={styles.inXl} data-testid="inbox-approval-waiting">{t('waitingRun')}</div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
