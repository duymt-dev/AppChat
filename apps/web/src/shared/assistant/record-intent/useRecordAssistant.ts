// Trợ lý gắn một bản ghi (TIP-023g §1.3–1.5, §4.1): mở = 0 lời gọi model / 0 ghi. Người dùng bấm Gửi việc → lượt Trợ lý thật (023c) mang
// `record_intent` có kiểu; cùng việc gửi lại (mạng / bấm hai lần) dùng LẠI request_id → cùng run, không chạy hai lần. Đổi bản ghi / thế hệ
// → request_id mới, kết quả trễ của phạm vi cũ bị bỏ. Đề xuất combo / chiến dịch đi đường riêng (`/assistant/record-proposals`) — chỉ đọc.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiRequestError,
  PROPOSAL_INTENTS,
  type RecordIntentInput,
  type RecordIntentKind,
  type RecordProposalDto,
} from '@appchat/shared';
import { transport } from '../../api/client';
import { useScreenAssistant } from '../useScreenAssistant';
import { useMe } from '../../shell/useShellData';
import { recordScopeOf, useRecordScopes } from './store';
import type { RecordScope } from './types';

export interface ProposalState {
  pending: boolean;
  value: RecordProposalDto | null;
  errorCode: string | null;
}

const uuid = () => crypto.randomUUID();

export function useRecordAssistant(module: string, scope: RecordScope | null) {
  const asst = useScreenAssistant(module);
  const ws = useMe().data?.current_workspace_id ?? '';
  useEffect(() => {
    if (ws) useRecordScopes.getState().bindWorkspace(ws);
  }, [ws]);
  // request_id theo (thế hệ phạm vi, ý định, việc) — gửi lại cùng bộ ba → cùng khoá.
  const keys = useRef(new Map<string, string>());
  const [proposal, setProposal] = useState<ProposalState>({ pending: false, value: null, errorCode: null });

  const keyOf = useCallback((s: RecordScope, intent: RecordIntentKind, task: string, fresh = false) => {
    const k = `${s.generation}\u0001${s.entity}\u0001${s.id}\u0001${intent}\u0001${task}`;
    if (fresh || !keys.current.has(k)) keys.current.set(k, uuid());
    return keys.current.get(k)!;
  }, []);

  const intentOf = useCallback(
    (s: RecordScope, intent: RecordIntentKind, task: string, fresh = false): RecordIntentInput => ({
      entity: s.entity,
      entity_id: s.id,
      intent,
      request_id: keyOf(s, intent, task, fresh),
      ...(s.version !== undefined ? { displayed_version: s.version } : {}),
      ...(task ? { user_task: task } : {}),
    }),
    [keyOf],
  );

  /** Gửi việc gắn bản ghi (người dùng bấm). `fresh` = "Hỏi lại" (lượt mới, khoá mới). */
  const submit = useCallback(
    async (task: string, intent: RecordIntentKind = 'inspect', fresh = false) => {
      if (!scope || !task.trim() || asst.typing) return;
      const ri = intentOf(scope, intent, task.trim(), fresh);
      await asst.send(task.trim(), { recordIntent: ri });
    },
    [scope, asst, intentOf],
  );

  /** Đề xuất chỉ đọc (combo / chiến dịch). Kết quả về khi phạm vi đã đổi → bỏ. */
  const propose = useCallback(
    async (intent: RecordIntentKind, task = '', fresh = false) => {
      if (!scope || !PROPOSAL_INTENTS.includes(intent)) return;
      const at = scope.generation;
      setProposal({ pending: true, value: null, errorCode: null });
      try {
        const value = await transport.post<RecordProposalDto>(
          '/assistant/record-proposals',
          intentOf(scope, intent, task.trim(), fresh),
        );
        if (recordScopeOf(module)?.generation === at) setProposal({ pending: false, value, errorCode: null });
      } catch (e) {
        if (recordScopeOf(module)?.generation === at)
          setProposal({
            pending: false,
            value: null,
            errorCode: e instanceof ApiRequestError ? e.error.code : 'NETWORK',
          });
      }
    },
    [module, scope, intentOf],
  );

  return {
    asst,
    submit,
    propose,
    proposal,
    resetProposal: () => setProposal({ pending: false, value: null, errorCode: null }),
  };
}
