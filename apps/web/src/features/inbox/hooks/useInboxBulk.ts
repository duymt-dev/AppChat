// Một thao tác hàng loạt = một lệnh conversation.bulk_update (TIP-025b §C.2). Kết quả trả về TỪNG hội thoại (thành công / lỗi mã an toàn);
// > 50 → 202 job_accepted (đã nhận, chưa xong — không báo thành công). Luôn qua xem trước (bulk) như mọi action hàng loạt.
'use client';
import { useState } from 'react';
import { useAction } from '@/shared/actions/useAction';
import type { BulkItemResult, BulkOp, BulkOutcome } from '../bulk-types';

type Result = { updated: number; failed?: number; items?: BulkItemResult[] };

export interface BulkArgs {
  ids: string[];
  op: BulkOp;
  assignee?: string;
  tag?: string;
}

const inputOf = (a: BulkArgs) => ({
  conversation_ids: a.ids,
  ...(a.op === 'assign' ? { assignee_user_id: a.assignee } : {}),
  ...(a.op === 'tag' ? { add_tags: [a.tag!] } : {}),
  ...(a.op === 'close' ? { status: 'closed' as const } : {}),
  ...(a.op === 'archive' ? { archive: true } : {}),
});

export function useInboxBulk() {
  const act = useAction<Result>('conversation.bulk_update');
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);
  const run = async (a: BulkArgs): Promise<BulkOutcome | null> => {
    let jobId: string | undefined;
    const r = await act.run(inputOf(a), { onAccepted: (x) => x.status === 'job_accepted' && (jobId = x.job_id) });
    const out: BulkOutcome | null = r
      ? { updated: r.result.updated, failed: r.result.failed ?? 0, items: r.result.items ?? [] }
      : jobId
        ? { updated: 0, failed: 0, items: [], jobId }
        : null;
    setOutcome(out);
    return out;
  };
  return { run, outcome, clearOutcome: () => setOutcome(null), pending: act.isPending };
}
