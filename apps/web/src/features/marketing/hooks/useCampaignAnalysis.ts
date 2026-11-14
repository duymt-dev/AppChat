// AI phân tích dữ liệu khách hàng (TIP-037, DC-246): bấm "Yêu cầu AI phân tích" = action campaign.analyze (ghi yêu cầu, trả run_id — worker
// ROLE=ai chạy model, tốn AI Credit); màn theo dõi GET /campaign-analyses/:run_id tới khi xong / lỗi rồi tải lại gợi ý. Không setTimeout giả:
// trạng thái "đang phân tích" kéo dài đúng bằng lượt thật. Mở modal khi đã có gợi ý → xem ngay (không chạy model lần nữa).
'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAction } from '@/shared/actions/useAction';
import { analysisQuery } from '../api';
import { useMarketingUi } from '../marketing-store';

export function useCampaignAnalysis() {
  const qc = useQueryClient();
  const runId = useMarketingUi((s) => s.runId);
  const set = useMarketingUi((s) => s.set);
  const analyze = useAction<{ run_id: string; status: string }>('campaign.analyze');
  const run = useQuery({ ...analysisQuery(runId ?? ''), enabled: !!runId });
  const status = run.data?.status;

  useEffect(() => {
    if (status !== 'completed') return;
    void qc.invalidateQueries({ queryKey: ['marketing', 'suggestions'] });
    void qc.invalidateQueries({ queryKey: ['marketing', 'meta'] });
    set({ analyze: 'list', runId: null });
  }, [status, qc, set]);

  /** Gửi yêu cầu phân tích (Hoàn tác không áp — chỉ ghi yêu cầu); lỗi 402 hết credit do useAction báo. */
  const start = async () => {
    const r = await analyze.run({}, { silent: true });
    if (r) set({ analyze: 'running', runId: r.result.run_id, pick: null });
  };

  return {
    start,
    starting: analyze.isPending,
    failed: status === 'failed' ? (run.data?.error ?? 'failed') : null,
    running: !!runId && status !== 'failed',
  };
}
