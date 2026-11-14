// Thao tác cơ hội (TIP-026c §2, §5) — mọi ghi qua useAction (action-first). Gửi if_version của bản đang hiển thị; lệch → 409 → thông báo
// "đã có người sửa" + làm mới (giữ lựa chọn của người dùng), không giả trạng thái trước khi server xác nhận. Áp dụng gợi ý AI = set_stage
// dưới quyền người bấm kèm suggestion_id (event ai_applied).
'use client';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import type { ApiRequestError, OpportunityStage } from '@appchat/shared';
import { useAction } from '../actions/useAction';

type Ref = { id: string; version: number };

export function useOpportunityActions() {
  const t = useTranslations('common.opportunity');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const create = useAction('contact_opportunity.create');
  const setStage = useAction('contact_opportunity.set_stage');
  const markLost = useAction('contact_opportunity.mark_lost');
  const reopen = useAction('contact_opportunity.reopen');
  const stale = (e: ApiRequestError) => {
    if (e.error.code !== 'STALE_VERSION' && e.status !== 409) return false;
    message.warning(t('stale'));
    void qc.invalidateQueries({ queryKey: ['crm'] });
    return true;
  };
  return {
    pending: create.isPending || setStage.isPending || markLost.isPending || reopen.isPending,
    create: (contactId: string, title: string, amount: string | null) => create.run({ contact_id: contactId, title: title.trim(), ...(amount ? { amount_vnd: amount } : {}) }),
    setStage: (o: Ref, stage: OpportunityStage, suggestionId?: string) => setStage.run({ opportunity_id: o.id, if_version: o.version, stage, ...(suggestionId ? { suggestion_id: suggestionId } : {}) }, { onError: stale }),
    markLost: (o: Ref, reason: string) => markLost.run({ opportunity_id: o.id, if_version: o.version, lost_reason: reason }, { onError: stale }),
    reopen: (o: Ref) => reopen.run({ opportunity_id: o.id, if_version: o.version }, { onError: stale }),
  };
}
