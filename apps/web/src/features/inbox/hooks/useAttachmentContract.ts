// "Tạo hợp đồng" từ tệp khách gửi (TIP-030b spec 3, 19): contract.create_from_attachment { message_id, attachment_idx } — khách = khách
// của hội thoại (server kiểm scope hội thoại + tệp thuộc tin trước khi đọc bytes). Xong → UiCommand mở hợp đồng; module Hợp đồng chưa
// gắn handler (đang ở Hộp thư) → chuyển tới /contracts mở đúng drawer. Không import component của features/contracts.
'use client';
import { useRouter } from 'next/navigation';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';

/** Tệp tạo được hợp đồng: PDF / DOCX (server kiểm lại theo bytes thật). */
export const CONTRACT_MIME = /^application\/(pdf|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

export function useAttachmentContract() {
  const can = useCan('contract.draft');
  const router = useRouter();
  const create = useAction<{ contract_id: string; code: string }>('contract.create_from_attachment');
  const run = async (messageId: string, idx: number) => {
    const r = await create.run({ message_id: messageId, attachment_idx: idx });
    if (!r) return null;
    const id = r.result.contract_id;
    if (!dispatchUiCommand({ type: 'open', entity: 'contract', id, view: 'drawer' })) router.push(`/contracts?open=${encodeURIComponent(id)}`);
    return r.result;
  };
  return { can, run, pending: create.isPending };
}
