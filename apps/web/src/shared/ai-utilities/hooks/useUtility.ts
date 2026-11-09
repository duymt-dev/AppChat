// Vòng đời một lần gọi kỹ năng tiện ích ở UI (TIP-019c §3.4, §4.2): gọi qua useAction (khoá Idempotency mỗi lần bấm — useAction cấp),
// giữ handle = utility_run_id; chưa xong (pending / unknown) → hỏi GET kết quả có giới hạn tới khi kết thúc. Đổi ngữ cảnh / huỷ / unmount
// → dừng hỏi + bỏ kết quả cũ (không lộ nguồn cũ sang ngữ cảnh mới). Đóng form không tuyên bố đã huỷ ở nhà cung cấp.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAction } from '../../actions/useAction';
import { transport } from '../../api/client';
import { utilityKeys } from '../api';
import type { UtilityActionId, UtilityEnvelope, UtilityPhase } from '../types';

export const POLL_MS = 1500;
export const POLL_MAX = 20;
const TERMINAL: ReadonlySet<UtilityEnvelope['state']> = new Set(['completed', 'failed', 'invalidated', 'cancelled']);

export function useUtility(actionId: UtilityActionId, contextKey: string) {
  const qc = useQueryClient();
  const action = useAction<UtilityEnvelope>(actionId);
  const [phase, setPhase] = useState<UtilityPhase>('idle');
  const [envelope, setEnvelope] = useState<UtilityEnvelope | null>(null);
  const gen = useRef(0);

  const reset = useCallback(() => {
    gen.current++;
    setPhase('idle');
    setEnvelope(null);
  }, []);

  // Host gắn key theo (kỹ năng, ngữ cảnh) nên đổi ngữ cảnh = form mới; ở đây chỉ chặn ghi state sau unmount / đổi khoá.
  useEffect(() => {
    const ref = gen;
    return () => void ref.current++;
  }, [actionId, contextKey]);

  const poll = useCallback(
    async (runId: string, mine: number) => {
      for (let i = 0; i < POLL_MAX; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (gen.current !== mine) return;
        const e = await transport.get<UtilityEnvelope>(`/ai-utilities/${runId}/result`).catch(() => null);
        if (gen.current !== mine) return;
        if (!e) {
          qc.removeQueries({ queryKey: utilityKeys.result(runId) });
          setPhase('error');
          return;
        }
        setEnvelope(e);
        if (TERMINAL.has(e.state)) return setPhase('done');
      }
      if (gen.current === mine) setPhase('pending');
    },
    [qc],
  );

  const run = useCallback(
    async (input: Record<string, unknown>) => {
      const mine = ++gen.current;
      setPhase('running');
      setEnvelope(null);
      const res = await action.run(input, { silent: true });
      if (gen.current !== mine) return;
      if (!res) return setPhase('error');
      const e = res.result;
      setEnvelope(e);
      if (TERMINAL.has(e.state)) return setPhase('done');
      setPhase('pending');
      await poll(e.utility_run_id, mine);
    },
    [action, poll],
  );

  return { phase, envelope, busy: phase === 'running' || action.isPending, run, reset };
}
