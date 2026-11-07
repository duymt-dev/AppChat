// AI soạn hợp đồng hai bước (TIP-030b spec 9, 18): "Soạn đề xuất" gọi `contract.prepare_draft` (có tính credit — một lượt model; khoá yêu cầu
// giữ theo nội dung nên bấm lại cùng nội dung không soạn thêm) → hiện đề xuất (giá catalog, dòng ngoài catalog, gợi ý) → "Tạo nháp từ đề
// xuất" gọi `contract.draft_from_content` (không gọi model). Không tự trình duyệt / gửi / ký.
'use client';
import { useState } from 'react';
import { useAction } from '@/shared/actions/useAction';
import type { ContractKind, DraftProposal } from '../types';

export interface DraftAsk {
  contact_id: string;
  kind: ContractKind;
  brief: string;
  quote_id?: string;
}

const keyOf = (a: DraftAsk) => JSON.stringify([a.contact_id, a.kind, a.brief.trim(), a.quote_id ?? '']);

export function useContractDraft() {
  const prepare = useAction<DraftProposal>('contract.prepare_draft');
  const create = useAction<{ contract_id: string; code: string; pending_suggestions: number }>('contract.draft_from_content');
  const [proposal, setProposal] = useState<DraftProposal | null>(null);
  const [error, setError] = useState('');
  // Khoá yêu cầu theo nội dung: cùng nội dung → cùng đề xuất (server trả lại, không gọi model lần hai).
  const [keys] = useState(() => new Map<string, string>());

  const ask = async (a: DraftAsk) => {
    setError('');
    const k = keyOf(a);
    if (!keys.has(k)) keys.set(k, crypto.randomUUID());
    let reason = 'failed';
    const r = await prepare.run(
      { contact_id: a.contact_id, kind: a.kind, brief: a.brief, request_key: keys.get(k), ...(a.quote_id ? { quote_id: a.quote_id } : {}) },
      { silent: true, onError: (e) => ((reason = e.error.code === 'CREDIT_EXHAUSTED' ? 'credit' : (Object.values(e.error.fields ?? {})[0] ?? 'failed')), true) },
    );
    if (!r) return setError(reason);
    setProposal(r.result);
  };

  const accept = () => (proposal ? create.run({ proposal_id: proposal.proposal_id }) : Promise.resolve(null));
  return { proposal, error, ask, accept, reset: () => setProposal(null), preparing: prepare.isPending, creating: create.isPending };
}
