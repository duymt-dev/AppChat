// Thẻ duyệt của hội thoại (TIP-025b §G): GET /conversations/:id/approvals. Khoá bắt đầu `approvals` nên approval.approve / reject /
// edit_and_approve (invalidates `approvals`) làm mới thẻ; sự kiện realtime đổi hàng duyệt cũng vậy. Kết nối lại đọc lại trạng thái bền.
import { queryOptions } from '@tanstack/react-query';
import type { ApprovalRowDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export interface ConversationApprovals {
  items: ApprovalRowDto[];
  pending: number;
}

export const conversationApprovalsQuery = (conversationId: string) =>
  queryOptions({
    queryKey: ['approvals', 'conversation', conversationId],
    queryFn: () => transport.get<ConversationApprovals>(`/conversations/${conversationId}/approvals`),
    refetchOnReconnect: true,
  });
