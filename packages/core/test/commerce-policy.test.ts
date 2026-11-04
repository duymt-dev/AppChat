// TIP-032b P1 — ngưỡng duyệt cấu hình được + trần agent (COMMERCE §3 Q5) và FORCE_APPROVAL ở policy (không miễn bằng hội thoại đang phục
// vụ / tác vụ không hỏi trước khi gửi). Thuần hàm — luồng DB thật ở apps/api/test/integration/commerce-gaps.test.ts.
import { describe, expect, it } from 'vitest';
import { approvalReasons, quoteTotals } from '@appchat/shared';
import { FORCE_APPROVAL_ACTIONS, decidePolicy } from '../src/kernel/actions/policy';

const one = (price: string, pct?: number) => quoteTotals([{ qty: 1, unit_price: price, tax_rate: 0 }], pct === undefined ? null : { kind: 'pct', value: pct });

describe('approvalReasons theo ngưỡng workspace', () => {
  it('mặc định 20M: 20.000.000 không duyệt, 20.000.001 duyệt', () => {
    expect(approvalReasons(one('20000000'))).toEqual([]);
    expect(approvalReasons(one('20000001'))).toEqual(['total']);
  });

  it('ngưỡng 30M: báo giá 25M gửi được; 5% đúng biên không duyệt, 5% + epsilon duyệt', () => {
    const policy = { total_vnd: '30000000', discount_pct: 5 };
    expect(approvalReasons(one('25000000'), { policy })).toEqual([]);
    expect(approvalReasons(one('1000000', 5), { policy })).toEqual([]);
    expect(approvalReasons(one('1000000', 5.01), { policy })).toEqual(['discount']);
  });

  it('agent giảm 6% → duyệt dù workspace cho 10%; Owner (không trần agent) giảm 6% không bị chặn', () => {
    const policy = { total_vnd: '20000000', discount_pct: 10 };
    expect(approvalReasons(one('1000000', 6), { policy, agentMaxPct: 5 })).toEqual(['discount']);
    expect(approvalReasons(one('1000000', 6), { policy })).toEqual([]);
  });

  it('ngưỡng tổng lớn dùng BigInt (không tràn số)', () => {
    expect(approvalReasons(one('999999999999'), { policy: { total_vnd: '999999999998', discount_pct: 5 } })).toEqual(['total']);
  });
});

describe('FORCE_APPROVAL ở policy', () => {
  it('agent trực kênh gửi hợp đồng trong hội thoại đang phục vụ → vẫn duyệt; tác vụ autoSend → vẫn duyệt', () => {
    expect(decidePolicy({ source: 'agent', risk: 'send', servedConversation: true, actionId: 'contract.send_for_signature' })).toBe('approval');
    expect(decidePolicy({ source: 'task', risk: 'send', autoSend: true, actionId: 'contract.send_for_signature' })).toBe('approval');
  });

  it('hoàn tiền / gửi hàng loạt / phụ lục nằm trong tập ép duyệt; UI / Trợ lý không đổi', () => {
    for (const id of ['payment.refund', 'campaign.approve', 'contract.appendix_send']) expect(FORCE_APPROVAL_ACTIONS.has(id)).toBe(true);
    expect(decidePolicy({ source: 'ui', risk: 'send', actionId: 'contract.send_for_signature' })).toBe('run');
    expect(decidePolicy({ source: 'assistant', risk: 'send', actionId: 'contract.send_for_signature' })).toBe('preview');
  });

  it('action thường của agent trong hội thoại phục vụ vẫn chạy như cũ (TIP-022)', () => {
    expect(decidePolicy({ source: 'agent', risk: 'send', servedConversation: true, actionId: 'message.send' })).toBe('run');
  });
});
